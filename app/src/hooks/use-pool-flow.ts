import { useCallback, useState } from 'react';
import { encodeFunctionData } from 'viem';
import { PoolService, type PoolContractCall } from '@/services/PoolService';
import { usePoolStore } from '@/stores/pool-store';
import { useWalletStore } from '@/stores/wallet-store';
import { InsurancePoolABI } from '@/lib/contracts';

export const POOL_FLOW_STEPS = [
  { label: 'Preparing transaction' },
  { label: 'Signing transaction' },
  { label: 'Confirming on-chain' },
  { label: 'Done' },
];

function encodePoolCall(call: PoolContractCall): { to: string; data: string } {
  const functionName = call.abi_function_signature.split('(')[0] as 'stake' | 'unstake';
  const abiDef = (InsurancePoolABI as ReadonlyArray<{ name?: string; inputs?: ReadonlyArray<{ name: string }> }>)
    .find((e) => e.name === functionName);
  if (!abiDef?.inputs) throw new Error(`ABI entry not found: ${functionName}`);

  const args = abiDef.inputs.map((input) => {
    const value = call.abi_parameters[input.name];
    if (value === undefined) throw new Error(`Missing parameter: ${input.name}`);
    return value;
  });

  return {
    to: call.contract_address,
    data: encodeFunctionData({ abi: InsurancePoolABI, functionName, args } as Parameters<typeof encodeFunctionData>[0]),
  };
}

export function useStakeFlow() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const execute = useCallback(async (amount: number): Promise<boolean> => {
    setInProgress(true);
    setError(null);
    try {
      setCurrentStep(0);
      const response = await PoolService.stake(amount);

      setCurrentStep(1);
      const encodedCall = encodePoolCall(response.call);
      await useWalletStore.getState().sendUserOperation([encodedCall]);

      setCurrentStep(2);
      usePoolStore.getState().addStake({
        public_id: response.public_id,
        amount: response.amount,
        pool_address: response.pool_address,
        created_at: new Date().toISOString(),
      });
      await usePoolStore.getState().fetchStatus();

      setCurrentStep(3);
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
      const response = await PoolService.unstake(stakePublicId);

      setCurrentStep(1);
      const encodedCall = encodePoolCall(response.call);
      await useWalletStore.getState().sendUserOperation([encodedCall]);

      setCurrentStep(2);
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

  return { currentStep, error, inProgress, steps: POOL_FLOW_STEPS, execute, reset };
}
