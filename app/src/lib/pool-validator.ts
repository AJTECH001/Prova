/**
 * Pre-flight pool configuration validator.
 *
 * InsurancePool stores _coverageManager as a private field with no public getter.
 * The canonical legitimacy check is PoolFactory.isPool(pool): if the factory
 * registered it, the pool was deployed with _coverageManager = CCM during initialize().
 *
 * Checks (run in parallel before any coverage UserOp):
 *   1. factory.isPool(pool)        — pool is registered in ConfidentialPoolFactory (CCM wired)
 *   2. CCM.escrow()                — ConfidentialEscrow connected
 *   3. pool.isPolicy(policy)       — policy whitelisted in pool
 *
 * assertPoolHealthy() only blocks on check #1 and #2 (CRITICAL); #3 is handled
 * server-side by PolicyAdminService.ensurePolicyReady() and is non-blocking.
 */

import { publicClient } from './public-client';
import { ADDRESSES } from './contracts';
import type { Hex } from 'viem';

// ─── Minimal ABIs (read-only views only) ─────────────────────────────────────

const FACTORY_VALIDATION_ABI = [
  {
    name: 'isPool',
    inputs: [{ name: 'pool', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const POOL_VALIDATION_ABI = [
  {
    name: 'isPolicy',
    inputs: [{ name: 'policy', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CCM_VALIDATION_ABI = [
  {
    name: 'escrow',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'poolFactory',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const REGISTRY_VALIDATION_ABI = [
  {
    name: 'isPolicy',
    inputs: [{ name: 'policy', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PoolValidationChecks {
  poolInFactory: boolean;        // factory.isPool(pool) — pool was created by canonical factory, CCM wired
  escrowConnected: boolean;      // CCM.escrow == ConfidentialEscrow
  factoryConnected: boolean;     // CCM.poolFactory == ConfidentialPoolFactory
  policyApprovedInPool: boolean; // pool.isPolicy(policy)
  policyInRegistry: boolean;     // PolicyRegistry.isPolicy(policy)
}

export interface PoolValidationResult {
  valid: boolean;
  checks: PoolValidationChecks;
  errors: string[];
}

// ─── Expected canonical addresses ─────────────────────────────────────────────

const EXPECTED = {
  escrow:   ADDRESSES.ConfidentialEscrow.toLowerCase(),
  factory:  ADDRESSES.PoolFactory.toLowerCase(),
} as const;

// ─── Core validation ──────────────────────────────────────────────────────────

/**
 * Read factory + CCM + pool state in parallel and return a complete validation
 * report. Never throws — failed reads are treated as misconfigured.
 */
export async function validatePoolConfiguration(
  poolAddress: string,
  policyAddress: string,
): Promise<PoolValidationResult> {
  const pool     = poolAddress as Hex;
  const policy   = policyAddress as Hex;
  const factory  = ADDRESSES.PoolFactory as Hex;
  const ccm      = ADDRESSES.ConfidentialCoverageManager as Hex;
  const registry = ADDRESSES.PolicyRegistry as Hex;

  const [poolInFactory, ccmEscrow, ccmFactory, policyInPool, policyInRegistry] =
    await Promise.all([
      publicClient
        .readContract({ address: factory, abi: FACTORY_VALIDATION_ABI, functionName: 'isPool', args: [pool] })
        .catch((): boolean => false),

      publicClient
        .readContract({ address: ccm, abi: CCM_VALIDATION_ABI, functionName: 'escrow' })
        .catch((): string => 'error:read-failed'),

      publicClient
        .readContract({ address: ccm, abi: CCM_VALIDATION_ABI, functionName: 'poolFactory' })
        .catch((): string => 'error:read-failed'),

      publicClient
        .readContract({ address: pool, abi: POOL_VALIDATION_ABI, functionName: 'isPolicy', args: [policy] })
        .catch((): boolean => false),

      publicClient
        .readContract({ address: registry, abi: REGISTRY_VALIDATION_ABI, functionName: 'isPolicy', args: [policy] })
        .catch((): boolean => false),
    ]);

  const checks: PoolValidationChecks = {
    poolInFactory:        !!poolInFactory,
    escrowConnected:      (ccmEscrow as string).toLowerCase() === EXPECTED.escrow,
    factoryConnected:     (ccmFactory as string).toLowerCase() === EXPECTED.factory,
    policyApprovedInPool: !!policyInPool,
    policyInRegistry:     !!policyInRegistry,
  };

  const errors: string[] = [];

  if (!checks.poolInFactory) {
    errors.push(
      `[CRITICAL] Pool ${poolAddress} is not registered in ConfidentialPoolFactory. ` +
        `CCM.purchaseCoverage will revert with InvalidPool. ` +
        `Run: npx hardhat run scripts/repair-pool.ts --network arb-sepolia`,
    );
  }
  if (!checks.escrowConnected) {
    errors.push(
      `[CRITICAL] CCM.escrow=${ccmEscrow} expected=${EXPECTED.escrow}. ` +
        `Call ConfidentialCoverageManager.setEscrow(ConfidentialEscrow).`,
    );
  }
  if (!checks.factoryConnected) {
    errors.push(
      `[WARN] CCM.poolFactory=${ccmFactory} expected=${EXPECTED.factory}. ` +
        `Call ConfidentialCoverageManager.setPoolFactory(ConfidentialPoolFactory).`,
    );
  }
  if (!checks.policyApprovedInPool) {
    errors.push(
      `[WARN] Policy ${policyAddress} not approved in pool ${poolAddress}. ` +
        `Waiting for PolicyAdminService.ensurePolicyReady() to run.`,
    );
  }
  if (!checks.policyInRegistry) {
    errors.push(
      `[WARN] Policy ${policyAddress} not in ConfidentialPolicyRegistry. ` +
        `Waiting for PolicyAdminService.ensurePolicyReady() to run.`,
    );
  }

  return { valid: Object.values(checks).every(Boolean), checks, errors };
}

/**
 * Throws only on CRITICAL failures (pool not in factory, escrow not connected).
 * WARN-level failures (policy/registry) are handled server-side by PolicyAdminService.
 */
export async function assertPoolHealthy(
  poolAddress: string,
  policyAddress: string,
): Promise<void> {
  const result = await validatePoolConfiguration(poolAddress, policyAddress);

  if (!result.checks.poolInFactory || !result.checks.escrowConnected) {
    const blocking = result.errors.filter((e) => e.startsWith('[CRITICAL]'));
    throw new Error(
      `Pool is misconfigured — coverage purchase will revert on-chain.\n` +
        blocking.join('\n'),
    );
  }
}

/**
 * Lightweight check: only verifies factory.isPool(pool).
 * Fast single-RPC version for health checks.
 */
export async function checkPoolManager(poolAddress: string): Promise<{
  ok: boolean;
  poolAddress: string;
  factoryAddress: string;
}> {
  const ok = await publicClient
    .readContract({
      address: ADDRESSES.PoolFactory as Hex,
      abi: FACTORY_VALIDATION_ABI,
      functionName: 'isPool',
      args: [poolAddress as Hex],
    })
    .catch((): boolean => false);

  return {
    ok: !!ok,
    poolAddress,
    factoryAddress: ADDRESSES.PoolFactory,
  };
}
