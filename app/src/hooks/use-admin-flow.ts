import { useCallback } from 'react';
import type { Abi } from 'viem';
import { useContractCall } from '@/hooks/use-contract-call';
import {
  ADDRESSES,
  TradeInvoiceResolverABI,
  TradeCreditInsurancePolicyABI,
  DebtorExposureRegistryABI,
  InsuranceClaimsRegistryABI,
  MockDebtorProofABI,
} from '@/lib/contracts';

// Encode 2-char ASCII string → bytes2 hex (e.g. "GB" → "0x4742")
export function strToBytes2(s: string): `0x${string}` {
  const hex = Array.from(s.slice(0, 2).padEnd(2, '\0'))
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}` as `0x${string}`;
}

// Encode 4-char ASCII string → bytes4 hex (e.g. "6419" → "0x36343139")
export function strToBytes4(s: string): `0x${string}` {
  const hex = Array.from(s.slice(0, 4).padEnd(4, '\0'))
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}` as `0x${string}`;
}

// Parse a comma-separated string of integers into a fixed-length number array
export function parseUint32Array(s: string, length: number): number[] {
  const parts = s.split(',').map((v) => parseInt(v.trim(), 10));
  if (parts.length !== length || parts.some(isNaN)) {
    throw new Error(`Expected exactly ${length} comma-separated integers`);
  }
  return parts;
}

export function useAdminFlow() {
  const { executeCall, loading, error, txHash } = useContractCall();

  // ── TradeInvoiceResolver ─────────────────────────────────────────────────

  const setEscrowContract = useCallback(
    (addr: string) =>
      executeCall(ADDRESSES.TradeInvoiceResolver, TradeInvoiceResolverABI as Abi, 'setEscrowContract', [addr]),
    [executeCall],
  );

  // ── TradeCreditInsurancePolicy ───────────────────────────────────────────

  const setConcentrationCap = useCallback(
    (debtorId: `0x${string}`, cap: bigint) =>
      executeCall(ADDRESSES.TradeCreditInsurancePolicy, TradeCreditInsurancePolicyABI as Abi, 'setConcentrationCap', [debtorId, cap]),
    [executeCall],
  );

  const setCountryRisk = useCallback(
    (countryCode: `0x${string}`, bps: number) =>
      executeCall(ADDRESSES.TradeCreditInsurancePolicy, TradeCreditInsurancePolicyABI as Abi, 'setCountryRisk', [countryCode, bps]),
    [executeCall],
  );

  const setIndustryRisk = useCallback(
    (industryCode: `0x${string}`, bps: number) =>
      executeCall(ADDRESSES.TradeCreditInsurancePolicy, TradeCreditInsurancePolicyABI as Abi, 'setIndustryRisk', [industryCode, bps]),
    [executeCall],
  );

  const setCurve = useCallback(
    (thresholds: number[], premiums: number[]) =>
      executeCall(ADDRESSES.TradeCreditInsurancePolicy, TradeCreditInsurancePolicyABI as Abi, 'setCurve', [thresholds, premiums]),
    [executeCall],
  );

  const setProtocolCaller = useCallback(
    (caller: string) =>
      executeCall(ADDRESSES.TradeCreditInsurancePolicy, TradeCreditInsurancePolicyABI as Abi, 'setProtocolCaller', [caller]),
    [executeCall],
  );

  // ── DebtorExposureRegistry ───────────────────────────────────────────────

  const registerContract = useCallback(
    (addr: string) =>
      executeCall(ADDRESSES.DebtorExposureRegistry, DebtorExposureRegistryABI as Abi, 'registerContract', [addr]),
    [executeCall],
  );

  const deregisterContract = useCallback(
    (addr: string) =>
      executeCall(ADDRESSES.DebtorExposureRegistry, DebtorExposureRegistryABI as Abi, 'deregisterContract', [addr]),
    [executeCall],
  );

  // ── InsuranceClaimsRegistry ──────────────────────────────────────────────

  const registerPolicy = useCallback(
    (addr: string) =>
      executeCall(ADDRESSES.InsuranceClaimsRegistry, InsuranceClaimsRegistryABI as Abi, 'registerPolicy', [addr]),
    [executeCall],
  );

  // ── MockDebtorProof (testnet only) ───────────────────────────────────────

  const setScore = useCallback(
    (debtorId: `0x${string}`, ctHash: bigint) =>
      executeCall(ADDRESSES.MockDebtorProof, MockDebtorProofABI as Abi, 'setScore', [debtorId, ctHash]),
    [executeCall],
  );

  const setDefaultScore = useCallback(
    (ctHash: bigint) =>
      executeCall(ADDRESSES.MockDebtorProof, MockDebtorProofABI as Abi, 'setDefaultScore', [ctHash]),
    [executeCall],
  );

  return {
    // TradeInvoiceResolver
    setEscrowContract,
    // TradeCreditInsurancePolicy
    setConcentrationCap,
    setCountryRisk,
    setIndustryRisk,
    setCurve,
    setProtocolCaller,
    // DebtorExposureRegistry
    registerContract,
    deregisterContract,
    // InsuranceClaimsRegistry
    registerPolicy,
    // MockDebtorProof
    setScore,
    setDefaultScore,
    // shared call state
    loading,
    error,
    txHash,
  };
}
