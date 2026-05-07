import { useCallback, useState } from 'react';
import { encodeFunctionData, parseEventLogs } from 'viem';
import { WithdrawalService, type CreateWithdrawalRequest, type WithdrawalCall } from '@/services/WithdrawalService';
import { useWalletStore } from '@/stores/wallet-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { publicClient } from '@/lib/public-client';
import { ConfidentialEscrowABI, cUSDCABI } from '@/lib/contracts';

const ABI_MAP = {
  redeemMultiple: ConfidentialEscrowABI,
  unshield: cUSDCABI,
} as const;

export const WITHDRAWAL_FLOW_STEPS = [
  { label: 'Creating withdrawal' },
  { label: 'Signing transaction' },
  { label: 'Confirming on-chain' },
  { label: 'Done' },
];

type AbiMapKey = keyof typeof ABI_MAP;

function isAbiMapKey(key: string): key is AbiMapKey {
  return key in ABI_MAP;
}

function encodeWithdrawalCall(call: WithdrawalCall): { to: string; data: string } {
  const functionName = call.abi_function_signature.split('(')[0];
  if (!isAbiMapKey(functionName)) throw new Error(`Unknown function: ${functionName}`);

  const abi = ABI_MAP[functionName];
  const abiDef = (abi as ReadonlyArray<{ name?: string; inputs?: ReadonlyArray<{ name: string }> }>)
    .find((entry) => entry.name === functionName);
  if (!abiDef?.inputs) throw new Error(`ABI entry not found: ${functionName}`);

  const args = abiDef.inputs.map((input: { name: string }) => {
    const value = (call.abi_parameters as Record<string, unknown>)[input.name];
    if (value === undefined) throw new Error(`Missing parameter: ${input.name}`);
    return value;
  });

  return {
    to: call.contract_address,
    data: encodeFunctionData({ abi, functionName, args } as Parameters<typeof encodeFunctionData>[0]),
  };
}

export function useWithdrawalFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [createdPublicId, setCreatedPublicId] = useState<string | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);

  const execute = useCallback(async (dto: CreateWithdrawalRequest): Promise<string | null> => {
    setInProgress(true);
    setError(null);
    setCreatedPublicId(null);
    setEstimatedAmount(null);

    try {
      setCurrentStep(0);
      const response = await useWithdrawalStore.getState().createWithdrawal(dto);
      setCreatedPublicId(response.public_id);
      setEstimatedAmount(response.estimated_amount);

      setCurrentStep(1);
      const encodedCalls = response.calls.map(encodeWithdrawalCall);
      const txHash = await useWalletStore.getState().sendUserOperation(encodedCalls);

      setCurrentStep(2);
      // Parse EscrowBatchRedeemed to confirm which IDs were actually redeemed on-chain.
      // Falls back gracefully if the receipt or event is unavailable.
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        const batchEvents = parseEventLogs({
          abi: ConfidentialEscrowABI,
          logs: receipt.logs,
          eventName: 'EscrowBatchRedeemed',
        });
        if (batchEvents.length > 0) {
          const redeemedIds = batchEvents[0].args.escrowIds.map(String);
          const requestedIds = dto.escrow_ids.map(String);
          const unredeemed = requestedIds.filter((id) => !redeemedIds.includes(id));
          if (unredeemed.length > 0) {
            throw new Error(`Partial redemption — escrow IDs not redeemed: ${unredeemed.join(', ')}`);
          }
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith('Partial redemption')) throw parseErr;
        // receipt not available yet — proceed, backend will reconcile
      }
      await WithdrawalService.reportTransaction(txHash, 'redeem', response.public_id);

      setCurrentStep(3);
      await useWithdrawalStore.getState().fetchWithdrawals(true);

      return response.public_id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
      return null;
    } finally {
      setInProgress(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setError(null);
    setInProgress(false);
    setCreatedPublicId(null);
    setEstimatedAmount(null);
  }, []);

  return {
    currentStep,
    error,
    inProgress,
    createdPublicId,
    estimatedAmount,
    steps: WITHDRAWAL_FLOW_STEPS,
    execute,
    reset,
  };
}
