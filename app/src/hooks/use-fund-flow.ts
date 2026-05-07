import { useCallback, useState } from 'react';
import { encodeFunctionData, erc20Abi, parseEventLogs } from 'viem';
import { fheService } from '@/services/FheService';
import { publicClient } from '@/lib/public-client';
import { useWalletStore } from '@/stores/wallet-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTransactionStore } from '@/stores/transaction-store';
import { useRefreshStore } from '@/stores/refresh-store';
import { EscrowService } from '@/services/EscrowService';
import { ConfidentialEscrowABI, cUSDCABI, ERC20ApproveABI, ADDRESSES } from '@/lib/contracts';

const OPERATOR_TTL = () => Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

export const FUND_FLOW_STEPS = [
  { label: 'Preparing' },
  { label: 'Approving USDC' },
  { label: 'Wrapping USDC → cUSDC' },
  { label: 'Authorising escrow contract' },
  { label: 'Encrypting payment' },
  { label: 'Sending payment' },
  { label: 'Done' },
];

export function useFundFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const execute = useCallback(async (
    escrowOnChainId: string,
    amountUsdc: number,
    escrowPublicId: string,
  ): Promise<boolean> => {
    setInProgress(true);
    setError(null);
    try {
      const walletAddress = useAuthStore.getState().walletAddress;
      if (!walletAddress) throw new Error('Wallet not connected');
      await useWalletStore.getState().ensureConnected();

      // Convert USDC amount to smallest unit (6 decimals)
      const amountSmallest = BigInt(Math.round(amountUsdc * 1_000_000));

      // Pre-check USDC balance before attempting any on-chain calls
      const usdcBalance = await publicClient.readContract({
        address: ADDRESSES.USDC as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });
      if (usdcBalance < amountSmallest) {
        const have = (Number(usdcBalance) / 1_000_000).toFixed(2);
        const need = amountUsdc.toFixed(2);
        throw new Error(`Insufficient USDC balance. You have ${have} USDC but need ${need} USDC. Please top up your wallet with testnet USDC.`);
      }
      const escrowAddress = ADDRESSES.ConfidentialEscrow as `0x${string}`;

      setCurrentStep(0);
      // Step 0: no-op, just signalling readiness

      // Step 1 — approve USDC for the cUSDC wrapper
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

      // Step 3 — set ConfidentialEscrow as operator on cUSDC (allows confidentialTransferFrom)
      setCurrentStep(3);
      const isOp = await publicClient.readContract({
        address: ADDRESSES.cUSDC as `0x${string}`,
        abi: cUSDCABI,
        functionName: 'isOperator',
        args: [walletAddress as `0x${string}`, escrowAddress],
      });
      if (!isOp) {
        const setOpData = encodeFunctionData({
          abi: cUSDCABI,
          functionName: 'setOperator',
          args: [escrowAddress, OPERATOR_TTL()],
        });
        await useWalletStore.getState().sendUserOperation([
          { to: ADDRESSES.cUSDC as `0x${string}`, data: setOpData },
        ]);
      }

      // Step 4 — FHE-encrypt the payment amount
      setCurrentStep(4);
      await fheService.initialize(walletAddress);
      const [encryptedPayment] = await fheService.encryptBatch([
        { type: 'euint64', value: amountSmallest },
      ]);

      // Step 5 — fund the escrow
      setCurrentStep(5);
      const fundData = encodeFunctionData({
        abi: ConfidentialEscrowABI,
        functionName: 'fund',
        args: [
          BigInt(escrowOnChainId),
          {
            ctHash: BigInt(encryptedPayment.data),
            securityZone: encryptedPayment.securityZone,
            utype: encryptedPayment.utype,
            signature: encryptedPayment.inputProof as `0x${string}`,
          },
        ],
      });
      const fundTxHash = await useWalletStore.getState().sendUserOperation([
        { to: escrowAddress, data: fundData },
      ]);

      // Reconcile FUNDED status — don't wait for webhook
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: fundTxHash as `0x${string}` });
        const events = parseEventLogs({
          abi: ConfidentialEscrowABI,
          logs: receipt.logs.filter(
            (l) => l.address.toLowerCase() === escrowAddress.toLowerCase(),
          ),
          eventName: 'EscrowFunded',
        });
        if (events.length > 0) {
          await EscrowService.reportFunded(escrowOnChainId, fundTxHash);
        }
      } catch { /* non-fatal — webhook may still deliver */ }

      setCurrentStep(6);
      useRefreshStore.getState().triggerBalanceRefresh();

      // Refresh transaction status
      await useTransactionStore.getState().fetchTransaction(escrowPublicId);

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
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

  return { currentStep, error, inProgress, steps: FUND_FLOW_STEPS, execute, reset };
}
