import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, arbitrum } from 'viem/chains';
import type { Chain } from 'viem';
import { getEnv } from '../../core/config.js';
import { getLogger } from '../../core/logger.js';
import { ApplicationHttpError } from '../../core/errors.js';
import { oracleService } from './oracle.service.js';

const POLICY_ABI = parseAbi([
  'function setConcentrationCap(bytes32 debtorId, uint64 cap) external',
  'function isAllowedContract(address addr) view returns (bool)',
  'function setAllowedContract(address addr, bool allowed) external',
]);

const POLICY_REGISTRY_ABI = parseAbi([
  'function isPolicy(address) view returns (bool)',
  'function registerPolicy(address policy_) returns (uint256 policyId)',
]);

const INSURANCE_POOL_ABI = parseAbi([
  'function isPolicy(address) view returns (bool)',
  'function addPolicy(address policy_) external',
]);

const POOL_FACTORY_VALIDATION_ABI = parseAbi([
  'function isPool(address) view returns (bool)',
]);

const CCM_ABI = parseAbi([
  'function escrow() view returns (address)',
  'function poolFactory() view returns (address)',
  'function setEscrow(address escrow_) external',
  'function setPoolFactory(address factory_) external',
]);

const CHAIN_BY_ID: Record<number, Chain> = {
  42161:  arbitrum,
  421614: arbitrumSepolia,
};

const USDC_DECIMALS = 6;

// ConfidentialEscrow stores `insuranceManager` in storage slot 2 (low 160 bits).
// The escrow exposes no public getter and its FHE functions cannot be simulated via
// eth_call, so reading this slot is the only reliable way to verify the escrow is wired
// to the CCM before a purchase. Derived by disassembling setInsuranceManager
// (selector 0xb51386f4 → SSTORE to slot 0x02 after a ZeroAddress guard).
const ESCROW_INSURANCE_MANAGER_SLOT = '0x2' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Cache TTL: 30 minutes. After this the service re-checks on-chain state.
const CACHE_TTL_MS = 30 * 60 * 1000;

// Reineira core addresses — env-overridable so different networks/redeployments work
// without code changes. Hardcoded values are the canonical Arbitrum Sepolia testnet defaults.
const getPolicyRegistryAddress = (): `0x${string}` =>
  (getEnv().POLICY_REGISTRY_ADDRESS ?? '0x962A6c7Be4fC765B0E8B601ab4BB210938660190') as `0x${string}`;
const getCcmAddress = (): `0x${string}` =>
  (getEnv().COVERAGE_MANAGER_ADDRESS ?? '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67') as `0x${string}`;
const getConfidentialEscrow = (): `0x${string}` =>
  (getEnv().ESCROW_CONTRACT_ADDRESS ?? '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6') as `0x${string}`;
const getConfidentialPoolFactory = (): `0x${string}` =>
  (getEnv().POOL_FACTORY_ADDRESS ?? '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80') as `0x${string}`;

/**
 * Admin operations that must run before a coverage purchase can succeed.
 *
 * Three one-time setup checks (TTL-cached, idempotent on retry):
 *
 * 1. ensurePolicyInRegistry — registers TradeCreditInsurancePolicy in the global
 *    ConfidentialPolicyRegistry so that InsurancePool.addPolicy can accept it.
 *    Callable by anyone; no special access required.
 *
 * 2. ensurePolicyInPool — adds TradeCreditInsurancePolicy to the InsurancePool's
 *    allowed-policy whitelist. Requires the admin wallet to be the pool's underwriter.
 *
 * 3. ensureDebtorRegistered — calls setConcentrationCap on TradeCreditInsurancePolicy
 *    for each buyer debtorId before their first coverage purchase. Requires admin
 *    wallet to be the owner of TradeCreditInsurancePolicy.
 */
export class PolicyAdminService {
  private readonly logger = getLogger('PolicyAdminService');

  // TTL-based cache: key → expiry timestamp (ms since epoch).
  // Entries older than CACHE_TTL_MS are evicted on next access and re-checked on-chain.
  private readonly cache = new Map<string, number>();

  private isCached(key: string): boolean {
    const expiresAt = this.cache.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  private setCached(key: string): void {
    this.cache.set(key, Date.now() + CACHE_TTL_MS);
  }

  private buildClients() {
    const env = getEnv();

    if (!env.ADMIN_PRIVATE_KEY) {
      throw ApplicationHttpError.internalError(
        'ADMIN_PRIVATE_KEY is not configured — cannot send admin transactions',
      );
    }
    if (!env.RPC_URL) {
      throw ApplicationHttpError.internalError(
        'RPC_URL is not configured — cannot send on-chain admin transactions',
      );
    }

    const chain: Chain = CHAIN_BY_ID[env.CHAIN_ID] ?? arbitrumSepolia;
    const account = privateKeyToAccount(env.ADMIN_PRIVATE_KEY as `0x${string}`);

    const walletClient = createWalletClient({ account, chain, transport: http(env.RPC_URL) });
    const publicClient = createPublicClient({ chain, transport: http(env.RPC_URL) });

    return { walletClient, publicClient };
  }

  /**
   * Ensures TradeCreditInsurancePolicy is registered in PolicyRegistry and then
   * whitelisted in the InsurancePool. Both are required before purchaseCoverage
   * will succeed — CCM checks pool.isPolicy(policy) and pool validates via
   * PolicyRegistry.isPolicy(policy) inside addPolicy.
   *
   * Called once per (pool, policy) pair per TTL window; idempotent on contract.
   */
  async ensurePolicyReady(poolAddress: string, policyAddress: string): Promise<void> {
    const key = `policy_ready:${poolAddress.toLowerCase()}:${policyAddress.toLowerCase()}`;
    if (this.isCached(key)) return;

    const { walletClient, publicClient } = this.buildClients();
    const policyRegistryAddress = getPolicyRegistryAddress();

    const isInRegistry = await publicClient.readContract({
      address: policyRegistryAddress,
      abi: POLICY_REGISTRY_ABI,
      functionName: 'isPolicy',
      args: [policyAddress as `0x${string}`],
    });

    if (!isInRegistry) {
      this.logger.info({ policyAddress }, 'Policy not in PolicyRegistry — registering');
      const hash = await walletClient.writeContract({
        address: policyRegistryAddress,
        abi: POLICY_REGISTRY_ABI,
        functionName: 'registerPolicy',
        args: [policyAddress as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      this.logger.info({ policyAddress, hash }, 'Policy registered in PolicyRegistry');
    }

    const isInPool = await publicClient.readContract({
      address: poolAddress as `0x${string}`,
      abi: INSURANCE_POOL_ABI,
      functionName: 'isPolicy',
      args: [policyAddress as `0x${string}`],
    });

    if (!isInPool) {
      this.logger.info({ poolAddress, policyAddress }, 'Policy not in pool — calling addPolicy');
      const hash = await walletClient.writeContract({
        address: poolAddress as `0x${string}`,
        abi: INSURANCE_POOL_ABI,
        functionName: 'addPolicy',
        args: [policyAddress as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      this.logger.info({ poolAddress, policyAddress, hash }, 'Policy added to InsurancePool');
    }

    const whitelisted = await this.ensureManagerWhitelisted(policyAddress);

    if (whitelisted) {
      this.setCached(key);
    }
  }

  /**
   * Ensures that the ConfidentialCoverageManager (CCM) is whitelisted in the
   * policy contract's Moat registry. This is required because onPolicySet()
   * uses the onlyProvaContract modifier.
   *
   * Returns true if correct or successfully repaired, false if failed.
   */
  async ensureManagerWhitelisted(policyAddress: string): Promise<boolean> {
    const ccmAddress = getCcmAddress();
    const key = `ccm_whitelisted:${policyAddress.toLowerCase()}:${ccmAddress.toLowerCase()}`;
    if (this.isCached(key)) return true;

    const { walletClient, publicClient } = this.buildClients();

    let isAllowed: boolean;
    try {
      isAllowed = (await publicClient.readContract({
        address: policyAddress as `0x${string}`,
        abi: POLICY_ABI,
        functionName: 'isAllowedContract',
        args: [ccmAddress],
      })) as boolean;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error({ err: msg, policyAddress }, 'Policy isAllowedContract() read failed');
      return false;
    }

    this.logger.info({ policyAddress, isAllowed, manager: ccmAddress }, 'Verifying Policy Manager Whitelist');

    if (!isAllowed) {
      this.logger.warn({ policyAddress, manager: ccmAddress }, 'CCM not whitelisted in policy — repairing');
      try {
        const hash = await walletClient.writeContract({
          address: policyAddress as `0x${string}`,
          abi: POLICY_ABI,
          functionName: 'setAllowedContract',
          args: [ccmAddress, true],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info({ policyAddress, hash }, 'CCM whitelisted in policy Moat registry');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg, policyAddress }, 'Policy setAllowedContract failed — admin may not be owner');
        throw new ApplicationHttpError(500, `Critical infra mismatch: CCM is not whitelisted in policy, and admin cannot repair it. ${msg}`);
      }
    }

    this.setCached(key);
    return true;
  }

  /**
   * Verifies that CCM.poolFactory() returns the canonical factory address AND
   * that the pool is registered in that factory.
   */
  async ensurePoolManagerCorrect(poolAddress: string): Promise<void> {
    const key = `pool_manager:${poolAddress.toLowerCase()}`;
    if (this.isCached(key)) return;

    const { publicClient } = this.buildClients();
    const pool = poolAddress as `0x${string}`;
    const ccmAddress = getCcmAddress();
    const expectedFactory = getConfidentialPoolFactory();

    let ccmFactory: string;
    try {
      ccmFactory = (await publicClient.readContract({
        address: ccmAddress,
        abi: CCM_ABI,
        functionName: 'poolFactory',
      })) as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw ApplicationHttpError.internalError(
        `CCM.poolFactory() read failed: ${msg}. ` +
          `Cannot verify pool — coverage purchase blocked. Check RPC_URL and CCM (${ccmAddress}).`,
      );
    }

    this.logger.info({ ccmFactory, expectedFactory }, 'CCM.poolFactory()');

    if (ccmFactory.toLowerCase() !== expectedFactory.toLowerCase()) {
      throw ApplicationHttpError.internalError(
        `CCM.poolFactory() = ${ccmFactory} but expected ${expectedFactory}. ` +
          `Every purchaseCoverage call will revert with InvalidPool (0x4d13139e). ` +
          `Fix: call CCM.setPoolFactory(${expectedFactory}) from CCM owner.`,
      );
    }

    let isRegistered: boolean;
    try {
      isRegistered = await publicClient.readContract({
        address: expectedFactory,
        abi: POOL_FACTORY_VALIDATION_ABI,
        functionName: 'isPool',
        args: [pool],
      }) as boolean;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw ApplicationHttpError.internalError(
        `PoolFactory.isPool() read failed for pool ${poolAddress}: ${msg}. ` +
          `Cannot verify pool registration — coverage purchase blocked.`,
      );
    }

    if (!isRegistered) {
      throw ApplicationHttpError.internalError(
        `Pool ${poolAddress} is NOT registered in ConfidentialPoolFactory (${expectedFactory}). ` +
          `CCM.purchaseCoverage will revert with InvalidPool (0x4d13139e). ` +
          `Action: deploy a new pool via ConfidentialPoolFactory.createPool(cUSDC), ` +
          `then update POOL_ADDRESS in .env and restart.`,
      );
    }

    this.setCached(key);
  }

  /**
   * Verifies CCM.escrow() and CCM.poolFactory() are set to the canonical
   * Reineira addresses. These are one-time admin calls after CCM deployment.
   */
  async ensureCcmWired(): Promise<void> {
    const ccmAddress = getCcmAddress();
    const key = `ccm_wired:${ccmAddress.toLowerCase()}`;
    if (this.isCached(key)) return;

    const { walletClient, publicClient } = this.buildClients();
    const expectedEscrow = getConfidentialEscrow();
    const expectedFactory = getConfidentialPoolFactory();

    const [escrow, factory] = await Promise.all([
      publicClient.readContract({ address: ccmAddress, abi: CCM_ABI, functionName: 'escrow' })
        .catch((e) => { this.logger.error({ err: e instanceof Error ? e.message : e }, 'CCM.escrow() read failed'); return null; }),
      publicClient.readContract({ address: ccmAddress, abi: CCM_ABI, functionName: 'poolFactory' })
        .catch((e) => { this.logger.error({ err: e instanceof Error ? e.message : e }, 'CCM.poolFactory() read failed'); return null; }),
    ]);

    if (escrow === null || factory === null) {
      this.logger.error({ ccm: ccmAddress }, 'CCM read failed — skipping wiring check, will retry next request');
      return;
    }

    this.logger.info({ escrow, factory, expectedEscrow, expectedFactory }, 'CCM wiring state');

    const repairErrors: string[] = [];

    if ((escrow as string).toLowerCase() !== expectedEscrow.toLowerCase()) {
      this.logger.warn({ current: escrow, expected: expectedEscrow }, 'CCM.escrow not set — calling setEscrow');
      try {
        const hash = await walletClient.writeContract({ address: ccmAddress, abi: CCM_ABI, functionName: 'setEscrow', args: [expectedEscrow] });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info('CCM.setEscrow confirmed');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg }, 'CCM.setEscrow failed — manual intervention required');
        repairErrors.push(`CCM.setEscrow failed: ${msg}`);
      }
    }

    if ((factory as string).toLowerCase() !== expectedFactory.toLowerCase()) {
      this.logger.warn({ current: factory, expected: expectedFactory }, 'CCM.poolFactory not set — calling setPoolFactory');
      try {
        const hash = await walletClient.writeContract({ address: ccmAddress, abi: CCM_ABI, functionName: 'setPoolFactory', args: [expectedFactory] });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info('CCM.setPoolFactory confirmed');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg }, 'CCM.setPoolFactory failed — manual intervention required');
        repairErrors.push(`CCM.setPoolFactory failed: ${msg}`);
      }
    }

    if (repairErrors.length > 0) {
      this.logger.error(
        { errors: repairErrors },
        'CCM wiring repairs failed — purchaseCoverage will revert with InvalidPool (0x4d13139e).',
      );
      return;
    }

    this.setCached(key);
  }

  /**
   * Ensures a concentration cap is set for the buyer's debtorId on
   * TradeCreditInsurancePolicy. Called per debtor before their first coverage.
   * Requires admin wallet to be the policy owner.
   */
  async ensureDebtorRegistered(
    policyAddress: string,
    debtorId: `0x${string}`,
  ): Promise<void> {
    const key = `debtor:${debtorId}`;
    if (this.isCached(key)) return;

    const env = getEnv();
    const capSmallest = BigInt(env.DEFAULT_CONCENTRATION_CAP_USDC) * BigInt(10 ** USDC_DECIMALS);

    const { walletClient, publicClient } = this.buildClients();

    this.logger.info(
      { debtorId, policyAddress, capUsdc: env.DEFAULT_CONCENTRATION_CAP_USDC },
      'Registering buyer — sending setConcentrationCap',
    );

    const hash = await walletClient.writeContract({
      address: policyAddress as `0x${string}`,
      abi: POLICY_ABI,
      functionName: 'setConcentrationCap',
      args: [debtorId, capSmallest],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    this.setCached(key);

    this.logger.info({ debtorId, hash }, 'Buyer registered — concentration cap set');

    const oracleAddress = env.ORACLE_DEBTOR_PROOF_ADDRESS;
    if (oracleAddress) {
      const creditScore = env.DEFAULT_DEBTOR_CREDIT_SCORE;
      try {
        await oracleService.encryptAndSetScore(oracleAddress, debtorId, creditScore);
      } catch (e) {
        this.logger.error(
          { err: e instanceof Error ? e.message : String(e), debtorId, oracleAddress },
          'Failed to set oracle score — coverage purchase may fail at evaluateRisk',
        );
      }
    } else {
      this.logger.warn(
        { debtorId },
        'ORACLE_DEBTOR_PROOF_ADDRESS not configured — skipping oracle score. ' +
          'Set it in .env after running scripts/upgrade-policy.ts',
      );
    }
  }
}
