import { useCallback, useState } from 'react';
import { encodeFunctionData, parseAbi, parseEventLogs, decodeAbiParameters } from 'viem';
import { PoolService } from '@/services/PoolService';
import { fheService } from '@/services/FheService';
import { publicClient } from '@/lib/public-client';
import { usePoolStore } from '@/stores/pool-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRefreshStore } from '@/stores/refresh-store';
import { InsurancePoolABI, ConfidentialCoverageManagerABI, ConfidentialEscrowABI, CoFHETaskManagerABI, cUSDCABI, ERC20ApproveABI, ADDRESSES } from '@/lib/contracts';
import { decodeError } from '@/lib/contract-errors';
import { assertPoolHealthy } from '@/lib/pool-validator';
import type { Hex } from 'viem';

const ORACLE_ABI = parseAbi(['function hasScore(bytes32) external view returns (bool)']);

async function assertOracleHasScore(oracleAddress: string, debtorId: Hex): Promise<void> {
  try {
    const hasScore = await publicClient.readContract({
      address: oracleAddress as Hex,
      abi: ORACLE_ABI,
      functionName: 'hasScore',
      args: [debtorId],
    });
    if (!hasScore) {
      throw new Error(
        'Credit score not yet registered for this buyer. ' +
          'The system is setting it up — please wait a moment and try again.',
      );
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Credit score not yet registered')) throw e;
    // If oracle read fails (wrong address, not deployed yet), log and continue —
    // the on-chain error from evaluateRisk will surface the issue.
    console.warn('[OracleCheck] hasScore read failed — continuing:', e instanceof Error ? e.message : e);
  }
}

function decodeCoverageError(e: unknown): string {
  const decoded = decodeError(e);
  return decoded.message;
}

// one year operator approval (uint48 — viem maps this to number, not bigint)
const OPERATOR_TTL = () => Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

export const POOL_FLOW_STEPS = [
  { label: 'Preparing' },
  { label: 'Approving USDC' },
  { label: 'Wrapping USDC → cUSDC' },
  { label: 'Authorising pool operator' },
  { label: 'Encrypting amount' },
  { label: 'Staking' },
  { label: 'Done' },
];

export const UNSTAKE_FLOW_STEPS = [
  { label: 'Preparing transaction' },
  { label: 'Unstaking from pool' },
  { label: 'Done' },
];

export const COVERAGE_FLOW_STEPS = [
  { label: 'Preparing coverage' },
  { label: 'Encrypting inputs' },
  { label: 'Signing transaction' },
  { label: 'Confirming on-chain' },
  { label: 'Done' },
];

export function useStakeFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const execute = useCallback(async (amount: number): Promise<boolean> => {
    setInProgress(true);
    setError(null);
    try {
      // Step 0 — call backend to record stake intent
      setCurrentStep(0);
      const response = await PoolService.stake(amount);
      const poolAddress = response.pool_address as `0x${string}`;
      const walletAddress = useAuthStore.getState().walletAddress;
      if (!walletAddress) throw new Error('Wallet not connected');

      const amountSmallest = BigInt(response.amount_smallest_unit);

      // Steps 1-3 — approve + wrap + setOperator batched into a single UserOp
      // to avoid sequential nonce conflicts on the bundler.
      setCurrentStep(1);
      const approveData = encodeFunctionData({
        abi: ERC20ApproveABI,
        functionName: 'approve',
        args: [ADDRESSES.cUSDC as `0x${string}`, amountSmallest],
      });
      const wrapData = encodeFunctionData({
        abi: cUSDCABI,
        functionName: 'wrap',
        args: [walletAddress as `0x${string}`, amountSmallest],
      });
      const isOp = await publicClient.readContract({
        address: ADDRESSES.cUSDC as `0x${string}`,
        abi: cUSDCABI,
        functionName: 'isOperator',
        args: [walletAddress as `0x${string}`, poolAddress],
      });
      const setupCalls: { to: `0x${string}`; data: string }[] = [
        { to: ADDRESSES.USDC as `0x${string}`, data: approveData },
        { to: ADDRESSES.cUSDC as `0x${string}`, data: wrapData },
      ];
      if (!isOp) {
        const setOpData = encodeFunctionData({
          abi: cUSDCABI,
          functionName: 'setOperator',
          args: [poolAddress, OPERATOR_TTL()],
        });
        setupCalls.push({ to: ADDRESSES.cUSDC as `0x${string}`, data: setOpData });
      }
      setCurrentStep(2);
      await useWalletStore.getState().sendUserOperation(setupCalls);
      setCurrentStep(3);

      // Step 4 — FHE-encrypt the amount
      setCurrentStep(4);
      await fheService.initialize(walletAddress);
      const [encryptedAmount] = await fheService.encryptBatch([
        { type: 'euint64', value: amountSmallest },
      ]);

      // Step 5 — stake
      setCurrentStep(5);
      const stakeData = encodeFunctionData({
        abi: InsurancePoolABI,
        functionName: 'stake',
        args: [
          {
            ctHash: BigInt(encryptedAmount.data),
            securityZone: encryptedAmount.securityZone,
            utype: encryptedAmount.utype,
            signature: encryptedAmount.inputProof as `0x${string}`,
          },
        ],
      });
      const txHash = await useWalletStore.getState().sendUserOperation([{ to: poolAddress, data: stakeData }]);

      // Parse the Staked(uint256 stakeId) event from the receipt to get the on-chain ID
      let onChainStakeId: string | undefined;
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        const events = parseEventLogs({ abi: InsurancePoolABI, logs: receipt.logs, eventName: 'Staked' });
        if (events.length > 0) onChainStakeId = events[0].args.stakeId.toString();
      } catch {
        // non-fatal — stake is still on-chain, confirmStake will at least mark it ACTIVE
      }

      // Mark stake ACTIVE on backend and store the on-chain stakeId
      await PoolService.confirmStake(response.public_id, txHash, onChainStakeId);

      setCurrentStep(6);
      usePoolStore.getState().addStake({
        public_id: response.public_id,
        amount: response.amount,
        pool_address: response.pool_address,
        created_at: new Date().toISOString(),
        on_chain_stake_id: onChainStakeId,
        tx_hash: txHash,
      });
      await usePoolStore.getState().fetchStatus();
      useRefreshStore.getState().triggerBalanceRefresh();

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stake failed');
      return false;
    } finally {
      setInProgress(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setError(null);
    setInProgress(false);
  }, []);

  return { currentStep, error, inProgress, steps: POOL_FLOW_STEPS, execute, reset };
}

export function useUnstakeFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const execute = useCallback(async (stakePublicId: string): Promise<boolean> => {
    setInProgress(true);
    setError(null);
    try {
      setCurrentStep(0);

      let poolAddress: string;
      let stakeIdRaw: string | null = null;

      try {
        const response = await PoolService.unstake(stakePublicId);
        poolAddress = response.call.contract_address;
        stakeIdRaw = (response.call.abi_parameters['stakeId'] ?? response.call.abi_parameters['stake_id']) as string | null;
      } catch (backendErr: any) {
        // Backend lost the record after an in-memory restart — fall back to localStorage.
        if (backendErr?.response?.status === 404) {
          const local = usePoolStore.getState().stakes.find((s) => s.public_id === stakePublicId);
          if (!local) {
            throw new Error('Stake not found in backend or locally. Please re-stake.', {
              cause: backendErr,
            });
          }
          poolAddress = local.pool_address;
          stakeIdRaw = local.on_chain_stake_id ?? null;
        } else {
          throw backendErr;
        }
      }

      setCurrentStep(1);

      // Recovery: if no stakeId is known, try the fastest path first (tx receipt),
      // then fall back to event log scanning with a wide window.
      if (stakeIdRaw == null || stakeIdRaw === '') {
        // Path A: we have the tx_hash from when the stake was submitted — parse
        // the Staked event directly from the receipt (no block range limit).
        const localStake = usePoolStore.getState().stakes.find((s) => s.public_id === stakePublicId);
        if (localStake?.tx_hash) {
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: localStake.tx_hash as `0x${string}` });
            const events = parseEventLogs({ abi: InsurancePoolABI, logs: receipt.logs, eventName: 'Staked' });
            if (events.length > 0) stakeIdRaw = events[0].args.stakeId.toString();
          } catch { /* fall through to scan */ }
        }

        // Path B: event log scan. On Arbitrum Sepolia blocks are ~0.25s apart so
        // 15_000_000 blocks ≈ 43 days. Use this as the ceiling to avoid timeouts.
        if (stakeIdRaw == null || stakeIdRaw === '') {
          const latest = await publicClient.getBlockNumber();
          const SCAN_WINDOW = 15_000_000n;
          const fromBlock = latest > SCAN_WINDOW ? latest - SCAN_WINDOW : 0n;
          const [stakedLogs, unstakedLogs] = await Promise.all([
            publicClient.getLogs({
              address: poolAddress as `0x${string}`,
              event: { name: 'Staked', type: 'event', anonymous: false, inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }] },
              fromBlock,
            }),
            publicClient.getLogs({
              address: poolAddress as `0x${string}`,
              event: { name: 'Unstaked', type: 'event', anonymous: false, inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }] },
              fromBlock,
            }),
          ]);

          const unstaked = new Set(
            unstakedLogs.map((l) => BigInt(l.topics[1] as string).toString()),
          );
          const active = stakedLogs
            .map((l) => BigInt(l.topics[1] as string).toString())
            .filter((id) => !unstaked.has(id))
            .reverse(); // most recent first

          if (active.length === 0) throw new Error('No active stakes found on pool. If you staked recently, please wait a moment and try again.');
          stakeIdRaw = active[0];
        }
      }

      if (stakeIdRaw == null) throw new Error('Could not determine on-chain stakeId');

      // Step 1 — unstake: pool sends cUSDC back to wallet
      const unstakeData = encodeFunctionData({
        abi: InsurancePoolABI,
        functionName: 'unstake',
        args: [BigInt(stakeIdRaw)],
      });
      await useWalletStore.getState().sendUserOperation([{ to: poolAddress, data: unstakeData }]);

      // Mark withdrawn in backend (best-effort — ignore if backend has no record)
      try {
        await PoolService.confirmUnstake(stakePublicId);
      } catch { /* backend may have lost the record on restart */ }

      usePoolStore.getState().removeStake(stakePublicId);
      await usePoolStore.getState().fetchStatus();
      useRefreshStore.getState().triggerBalanceRefresh();

      setCurrentStep(2);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unstake failed');
      return false;
    } finally {
      setInProgress(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setError(null);
    setInProgress(false);
  }, []);

  return { currentStep, error, inProgress, steps: UNSTAKE_FLOW_STEPS, execute, reset };
}

export function useCoverageFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const execute = useCallback(async (
    escrowPublicId: string,
    opts: { pool_address?: string; coverage_amount?: number; expiry?: string } = {},
  ): Promise<boolean> => {
    setInProgress(true);
    setError(null);
    try {
      // ── Step 0: fetch coverage parameters from backend ────────────────────
      setCurrentStep(0);
      const response = await PoolService.buyCoverage(escrowPublicId, opts);

      // ── Preflight: verify pool ↔ manager wiring before touching the wallet ─
      await assertPoolHealthy(response.pool_address, response.policy_address);

      // ── Step 1: FHE encryption ─────────────────────────────────────────────
      setCurrentStep(1);
      const walletAddress = useAuthStore.getState().walletAddress;
      if (!walletAddress) throw new Error('Wallet not connected');

      // ── Preflight: verify oracle has a score for this buyer ───────────────
      // The debtorId in policyData (first 32 bytes) is the canonical debtor
      // identifier used on-chain — NOT necessarily the connected wallet.
      // In trade credit insurance: seller buys coverage, buyer is the debtor.
      const oracleAddress = (ADDRESSES as Record<string, string>).OracleDebtorProof;
      if (oracleAddress && response.policy_data && response.policy_data.length >= 66) {
        try {
          const [debtorId] = decodeAbiParameters(
            [{ type: 'bytes32' }],
            response.policy_data as Hex,
          );
          await assertOracleHasScore(oracleAddress, debtorId as Hex);
        } catch (e: unknown) {
          if (e instanceof Error && e.message.includes('Credit score not yet registered')) throw e;
          console.warn('[OracleCheck] preflight decode failed — continuing:', e instanceof Error ? e.message : e);
        }
      }
      await fheService.initialize(walletAddress);

      const [encryptedHolder, encryptedCoverage] = await fheService.encryptBatch([
        { type: 'eaddress', value: walletAddress },
        { type: 'euint64', value: BigInt(response.coverage_amount_smallest_unit) },
      ]);

      console.debug('[CoverageFlow] encryptedHolder utype:', encryptedHolder.utype,
        'ctHash:', encryptedHolder.data.slice(0, 18),
        'sigLen:', encryptedHolder.inputProof?.length ?? 0);
      console.debug('[CoverageFlow] encryptedCoverage utype:', encryptedCoverage.utype,
        'ctHash:', encryptedCoverage.data.slice(0, 18),
        'sigLen:', encryptedCoverage.inputProof?.length ?? 0);

      // ── Step 2: simulate + sign ───────────────────────────────────────────
      setCurrentStep(2);
      await useWalletStore.getState().ensureConnected();

      const coverageArgs = [
        {
          ctHash: BigInt(encryptedHolder.data),
          securityZone: encryptedHolder.securityZone,
          utype: encryptedHolder.utype,
          signature: encryptedHolder.inputProof as Hex,
        },
        response.pool_address as Hex,
        response.policy_address as Hex,
        BigInt(response.escrow_on_chain_id),
        {
          ctHash: BigInt(encryptedCoverage.data),
          securityZone: encryptedCoverage.securityZone,
          utype: encryptedCoverage.utype,
          signature: encryptedCoverage.inputProof as Hex,
        },
        BigInt(response.expiry),
        response.policy_data as Hex,
        response.risk_proof as Hex,
      ] as const;

      // Dry-run note: purchaseCoverage uses FHE operations (FHE.asEuint64, evaluateRisk)
      // that require the CoFHE coprocessor, which is unavailable on standard Arbitrum
      // Sepolia RPC. Any simulateContract call will revert inside the FHE layer with
      // unpredictable selectors — simulation results are not reliable for this function.
      // assertPoolHealthy() above already validated the real infrastructure state via
      // read calls. Skip simulation and let the UserOp surface any on-chain errors.

      // ── Pre-grant CCM FHE ACL on the escrow amount handle ─────────────────
      // ConfidentialEscrow.getAmount() is a view function and cannot call FHE.allow().
      // CCM tries to use the returned handle in FHE.lte(coverage, escrowAmount) but
      // fails with ACLNotAllowed because it was never granted access. Fix: the escrow
      // creator (this wallet/Kernel) holds permanent ACL on the amount handle from
      // create() time and can delegate to CCM via TaskManager.allow() in the same
      // UserOp, before purchaseCoverage is invoked.
      const escrowAmountHandle = await publicClient.readContract({
        address: ADDRESSES.ConfidentialEscrow as Hex,
        abi: ConfidentialEscrowABI,
        functionName: 'getAmount',
        args: [BigInt(response.escrow_on_chain_id)],
      });

      const allowData = encodeFunctionData({
        abi: CoFHETaskManagerABI,
        functionName: 'allow',
        args: [
          BigInt(escrowAmountHandle as `0x${string}`),
          ADDRESSES.ConfidentialCoverageManager as Hex,
        ],
      });

      const coverageData = encodeFunctionData({
        abi: ConfidentialCoverageManagerABI,
        functionName: 'purchaseCoverage',
        args: coverageArgs,
      });

      // ── Step 3: submit UserOp (ACL grant + purchaseCoverage in one batch) ──
      const txHash = await useWalletStore.getState().sendUserOperation([
        { to: ADDRESSES.CoFHETaskManager as Hex, data: allowData },
        { to: response.contract_address as Hex, data: coverageData },
      ]);

      // ── Step 4: confirm on-chain + report to backend ──────────────────────
      setCurrentStep(3);
      let coverageId: string | undefined;
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
        const events = parseEventLogs({
          abi: ConfidentialCoverageManagerABI,
          logs: receipt.logs,
          eventName: 'CoveragePurchased',
        });
        if (events.length > 0) coverageId = (events[0].args as { coverageId: bigint }).coverageId.toString();
      } catch { /* non-fatal — backend webhook will pick it up */ }

      if (coverageId) {
        try { await PoolService.confirmCoverage(escrowPublicId, coverageId, txHash); } catch { /* non-fatal */ }
      }

      await usePoolStore.getState().fetchStatus();

      setCurrentStep(4);
      return true;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      console.error('[CoverageFlow] raw error:', raw);
      setError(decodeCoverageError(e));
      return false;
    } finally {
      setInProgress(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setError(null);
    setInProgress(false);
  }, []);

  return { currentStep, error, inProgress, steps: COVERAGE_FLOW_STEPS, execute, reset };
}
