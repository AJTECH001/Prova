import { useCallback, useState } from 'react';
import { publicClient } from '@/lib/public-client';
import {
  ADDRESSES,
  TradeInvoiceResolverABI,
  TradeCreditInsurancePolicyABI,
  DebtorExposureRegistryABI,
  InsuranceClaimsRegistryABI,
} from '@/lib/contracts';

export interface ContractState {
  // TradeInvoiceResolver
  escrowContract: string | null;
  minWaitingPeriod: bigint | null;
  maxWaitingPeriod: bigint | null;
  resolverOwner: string | null;
  // TradeCreditInsurancePolicy
  curveVersion: number | null;
  protocolCaller: string | null;
  debtorProofAdapter: string | null;
  exposureRegistry: string | null;
  lossHistory: string | null;
  policyOwner: string | null;
  // Registry wiring
  policyInExposureRegistry: boolean | null;
  policyInClaimsRegistry: boolean | null;
}

const EMPTY: ContractState = {
  escrowContract: null,
  minWaitingPeriod: null,
  maxWaitingPeriod: null,
  resolverOwner: null,
  curveVersion: null,
  protocolCaller: null,
  debtorProofAdapter: null,
  exposureRegistry: null,
  lossHistory: null,
  policyOwner: null,
  policyInExposureRegistry: null,
  policyInClaimsRegistry: null,
};

export function useContractRead() {
  const [state, setState] = useState<ContractState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resolver  = ADDRESSES.TradeInvoiceResolver       as `0x${string}`;
      const policy    = ADDRESSES.TradeCreditInsurancePolicy  as `0x${string}`;
      const exposure  = ADDRESSES.DebtorExposureRegistry      as `0x${string}`;
      const claims    = ADDRESSES.InsuranceClaimsRegistry     as `0x${string}`;

      const [
        escrowContract,
        minWaitingPeriod,
        maxWaitingPeriod,
        resolverOwner,
        curveVersion,
        protocolCaller,
        debtorProofAdapter,
        exposureRegistryAddr,
        lossHistory,
        policyOwner,
        policyInExposureRegistry,
        policyInClaimsRegistry,
      ] = await Promise.all([
        publicClient.readContract({ address: resolver, abi: TradeInvoiceResolverABI,       functionName: 'escrowContract' }),
        publicClient.readContract({ address: resolver, abi: TradeInvoiceResolverABI,       functionName: 'MIN_WAITING_PERIOD' }),
        publicClient.readContract({ address: resolver, abi: TradeInvoiceResolverABI,       functionName: 'MAX_WAITING_PERIOD' }),
        publicClient.readContract({ address: resolver, abi: TradeInvoiceResolverABI,       functionName: 'owner' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'curveVersion' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'protocolCaller' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'debtorProofAdapter' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'exposureRegistry' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'lossHistory' }),
        publicClient.readContract({ address: policy,   abi: TradeCreditInsurancePolicyABI, functionName: 'owner' }),
        publicClient.readContract({ address: exposure, abi: DebtorExposureRegistryABI,     functionName: 'isRegistered',     args: [policy] }),
        publicClient.readContract({ address: claims,   abi: InsuranceClaimsRegistryABI,    functionName: 'isAllowedContract', args: [policy] }),
      ]);

      setState({
        escrowContract:          escrowContract as string,
        minWaitingPeriod:        minWaitingPeriod as bigint,
        maxWaitingPeriod:        maxWaitingPeriod as bigint,
        resolverOwner:           resolverOwner as string,
        curveVersion:            Number(curveVersion),
        protocolCaller:          protocolCaller as string,
        debtorProofAdapter:      debtorProofAdapter as string,
        exposureRegistry:        exposureRegistryAddr as string,
        lossHistory:             lossHistory as string,
        policyOwner:             policyOwner as string,
        policyInExposureRegistry: policyInExposureRegistry as boolean,
        policyInClaimsRegistry:  policyInClaimsRegistry as boolean,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read contract state');
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, error, fetchAll };
}
