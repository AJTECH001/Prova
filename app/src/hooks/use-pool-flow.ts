import { useCallback, useState } from 'react';
import { encodeFunctionData, parseEventLogs } from 'viem';
import { PoolService } from '@/services/PoolService';
import { fheService } from '@/services/FheService';
import { publicClient } from '@/lib/public-client';
import { usePoolStore } from '@/stores/pool-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useAuthStore } from '@/stores/auth-store';
import { InsurancePoolABI, ConfidentialCoverageManagerABI, cUSDCABI, ERC20ApproveABI, ADDRESSES } from '@/lib/contracts';

const USDC_DECIMALS = 6;
// one year operator approval
const OPERATOR_TTL = () => BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

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
  { label: 'Unwrapping cUSDC → USDC' },
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

      // Step 1 — approve USDC for the cUSDC wrapper (only if needed)
      setCurrentStep(1);
      const approveData = encodeFunctionData({
        abi: ERC20ApproveABI,
        functionName: 'approve',
        args: [ADDRESSES.cUSDC as `0x${string}`, amountSmallest],
      });
      await useWalletStore.getState().sendUserOperation([
        { to: ADDRESSES.USDC as `0x${string}`, data: approveData },
      ]);

      // Step 2 — wrap USDC → cUSDC
      setCurrentStep(2);
      const wrapData = encodeFunctionData({
        abi: cUSDCABI,
        functionName: 'wrap',
        args: [walletAddress as `0x${string}`, amountSmallest],
      });
      await useWalletStore.getState().sendUserOperation([
        { to: ADDRESSES.cUSDC as `0x${string}`, data: wrapData },
      ]);

      // Step 3 — set pool as operator on cUSDC (allows pool to confidentialTransferFrom)
      setCurrentStep(3);
      const isOp = await publicClient.readContract({
        address: ADDRESSES.cUSDC as `0x${string}`,
        abi: cUSDCABI,
        functionName: 'isOperator',
        args: [walletAddress as `0x${string}`, poolAddress],
      });
      if (!isOp) {
        const setOpData = encodeFunctionData({
          abi: cUSDCABI,
          functionName: 'setOperator',
          args: [poolAddress, OPERATOR_TTL()],
        });
        await useWalletStore.getState().sendUserOperation([
          { to: ADDRESSES.cUSDC as `0x${string}`, data: setOpData },
        ]);
      }

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
      });
      await usePoolStore.getState().fetchStatus();

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
          if (!local) throw new Error('Stake not found in backend or locally. Please re-stake.');
          poolAddress = local.pool_address;
          stakeIdRaw = local.on_chain_stake_id ?? null;
        } else {
          throw backendErr;
        }
      }

      setCurrentStep(1);

      // Recovery scan: if no stakeId is known, scan the pool's events to find the most
      // recent active (not yet unstaked) stakeId belonging to this pool.
      if (stakeIdRaw == null || stakeIdRaw === '') {
        const [stakedLogs, unstakedLogs] = await Promise.all([
          publicClient.getLogs({
            address: poolAddress as `0x${string}`,
            event: { name: 'Staked', type: 'event', anonymous: false, inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }] },
            fromBlock: 0n,
          }),
          publicClient.getLogs({
            address: poolAddress as `0x${string}`,
            event: { name: 'Unstaked', type: 'event', anonymous: false, inputs: [{ indexed: true, name: 'stakeId', type: 'uint256' }] },
            fromBlock: 0n,
          }),
        ]);

        const unstaked = new Set(
          unstakedLogs.map((l) => BigInt(l.topics[1] as string).toString()),
        );
        const active = stakedLogs
          .map((l) => BigInt(l.topics[1] as string).toString())
          .filter((id) => !unstaked.has(id))
          .reverse(); // most recent first

        if (active.length === 0) throw new Error('No active stakes found on pool — nothing to unstake');
        stakeIdRaw = active[0];
      }

      if (stakeIdRaw == null) throw new Error('Could not determine on-chain stakeId');

      // Step 1 — unstake: pool sends cUSDC back to wallet
      const unstakeData = encodeFunctionData({
        abi: InsurancePoolABI,
        functionName: 'unstake',
        args: [BigInt(stakeIdRaw)],
      });
      await useWalletStore.getState().sendUserOperation([{ to: poolAddress, data: unstakeData }]);

      // Step 2 — unwrap cUSDC → USDC so the LP's USDC balance is restored
      setCurrentStep(2);
      const walletAddress = useAuthStore.getState().walletAddress;
      const localStake = usePoolStore.getState().stakes.find((s) => s.public_id === stakePublicId);
      if (walletAddress && localStake) {
        const amountSmallest = BigInt(Math.round(localStake.amount * 10 ** USDC_DECIMALS));
        const unwrapData = encodeFunctionData({
          abi: cUSDCABI,
          functionName: 'unwrap',
          args: [walletAddress as `0x${string}`, amountSmallest],
        });
        await useWalletStore.getState().sendUserOperation([
          { to: ADDRESSES.cUSDC as `0x${string}`, data: unwrapData },
        ]);
      }

      // Mark withdrawn in backend (best-effort — ignore if backend has no record)
      try {
        await PoolService.confirmUnstake(stakePublicId);
      } catch { /* backend may have lost the record on restart */ }

      usePoolStore.getState().removeStake(stakePublicId);
      await usePoolStore.getState().fetchStatus();

      setCurrentStep(3);
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
      setCurrentStep(0);
      const response = await PoolService.buyCoverage(escrowPublicId, opts);

      setCurrentStep(1);
      const walletAddress = useAuthStore.getState().walletAddress;
      if (!walletAddress) throw new Error('Wallet not connected');
      await fheService.initialize(walletAddress);

      // FHE-encrypt holder address and coverage amount
      const [encryptedHolder, encryptedCoverage] = await fheService.encryptBatch([
        { type: 'eaddress', value: walletAddress },
        { type: 'euint64', value: BigInt(response.coverage_amount_smallest_unit) },
      ]);

      setCurrentStep(2);
      await useWalletStore.getState().ensureConnected();
      const data = encodeFunctionData({
        abi: ConfidentialCoverageManagerABI,
        functionName: 'purchaseCoverage',
        args: [
          {
            ctHash: BigInt(encryptedHolder.data),
            securityZone: encryptedHolder.securityZone,
            utype: encryptedHolder.utype,
            signature: encryptedHolder.inputProof as `0x${string}`,
          },
          response.pool_address as `0x${string}`,
          response.policy_address as `0x${string}`,
          BigInt(response.escrow_on_chain_id),
          {
            ctHash: BigInt(encryptedCoverage.data),
            securityZone: encryptedCoverage.securityZone,
            utype: encryptedCoverage.utype,
            signature: encryptedCoverage.inputProof as `0x${string}`,
          },
          BigInt(response.expiry),
          '0x' as `0x${string}`,
          response.risk_proof as `0x${string}`,
        ],
      });

      await useWalletStore.getState().sendUserOperation([{ to: response.contract_address, data }]);

      setCurrentStep(3);
      await usePoolStore.getState().fetchStatus();

      setCurrentStep(4);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coverage purchase failed');
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
