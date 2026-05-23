import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
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

// InsurancePool has no insuranceManager() getter — _coverageManager is private.
// Pool legitimacy is validated via PoolFactory.isPool(): if true, factory deployed it
// with _coverageManager = CCM set during initialize().
const POOL_FACTORY_VALIDATION_ABI = parseAbi([
  'function isPool(address) view returns (bool)',
]);

const CCM_ABI = parseAbi([
  'function escrow() view returns (address)',
  'function poolFactory() view returns (address)',
  'function setEscrow(address escrow_) external',
  'function setPoolFactory(address factory_) external',
]);

// Reineira core — Arbitrum Sepolia (canonical, not env-overridable)
const POLICY_REGISTRY_ADDRESS   = '0x962A6c7Be4fC765B0E8B601ab4BB210938660190' as const;
const getCcmAddress = () => getEnv().COVERAGE_MANAGER_ADDRESS ?? '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';
const CONFIDENTIAL_ESCROW        = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6' as const;
const CONFIDENTIAL_POOL_FACTORY  = '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80' as const;

const USDC_DECIMALS = 6;

/**
 * Admin operations that must run before a coverage purchase can succeed.
 *
 * Three one-time setup checks (cached in memory, idempotent on retry):
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

  // Per-debtor cache: debtorId → cap already set
  private readonly registered = new Set<string>();

  // Per-pool/policy pair cache: `${pool}:${policy}` → already configured
  private readonly poolPolicyReady = new Set<string>();

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

    const account = privateKeyToAccount(env.ADMIN_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(env.RPC_URL),
    });

    return { walletClient, publicClient };
  }

  /**
   * Ensures TradeCreditInsurancePolicy is registered in PolicyRegistry and then
   * whitelisted in the InsurancePool. Both are required before purchaseCoverage
   * will succeed — CCM checks pool.isPolicy(policy) and pool validates via
   * PolicyRegistry.isPolicy(policy) inside addPolicy.
   *
   * Called once per (pool, policy) pair per server process; idempotent on contract.
   */
  async ensurePolicyReady(poolAddress: string, policyAddress: string): Promise<void> {
    const key = `${poolAddress.toLowerCase()}:${policyAddress.toLowerCase()}`;
    if (this.poolPolicyReady.has(key)) return;

    const { walletClient, publicClient } = this.buildClients();

    // 1. Register policy in ConfidentialPolicyRegistry if needed.
    //    Anyone can call registerPolicy — no owner restriction.
    const isInRegistry = await publicClient.readContract({
      address: POLICY_REGISTRY_ADDRESS,
      abi: POLICY_REGISTRY_ABI,
      functionName: 'isPolicy',
      args: [policyAddress as `0x${string}`],
    });

    if (!isInRegistry) {
      this.logger.info({ policyAddress }, 'Policy not in PolicyRegistry — registering');
      const hash = await walletClient.writeContract({
        address: POLICY_REGISTRY_ADDRESS,
        abi: POLICY_REGISTRY_ABI,
        functionName: 'registerPolicy',
        args: [policyAddress as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      this.logger.info({ policyAddress, hash }, 'Policy registered in PolicyRegistry');
    }

    // 2. Add policy to the InsurancePool's whitelist if needed.
    //    Requires admin wallet to be the pool's underwriter.
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

    // 3. Ensure CCM is whitelisted in the policy contract (Moat Registry P5).
    //    Root cause of 0x19729203 (UnauthorizedPolicyCaller) / 0x484687d4 (NotAProvaContract).
    const whitelisted = await this.ensureManagerWhitelisted(policyAddress);

    if (whitelisted) {
      this.poolPolicyReady.add(key);
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
    if (this.poolPolicyReady.has(key)) return true;

    const { walletClient, publicClient } = this.buildClients();

    let isAllowed: boolean;
    try {
      isAllowed = (await publicClient.readContract({
        address: policyAddress as `0x${string}`,
        abi: POLICY_ABI,
        functionName: 'isAllowedContract',
        args: [ccmAddress as `0x${string}`],
      })) as boolean;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error({ err: msg, policyAddress }, 'Policy isAllowedContract() read failed');
      return false;
    }

    this.logger.info({ policyAddress, isAllowed, manager: ccmAddress }, 'Verifying Policy Manager Whitelist');

    if (!isAllowed) {
      this.logger.warn(
        { policyAddress, manager: ccmAddress },
        'CCM not whitelisted in policy — repairing',
      );
      try {
        const hash = await walletClient.writeContract({
          address: policyAddress as `0x${string}`,
          abi: POLICY_ABI,
          functionName: 'setAllowedContract',
          args: [ccmAddress as `0x${string}`, true],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info({ policyAddress, hash }, 'CCM whitelisted in policy Moat registry');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg, policyAddress }, 'Policy setAllowedContract failed — admin may not be owner');
        throw new ApplicationHttpError(500, `Critical infra mismatch: CCM is not whitelisted in policy, and admin cannot repair it. ${msg}`);
      }
    }

    this.poolPolicyReady.add(key);
    return true;
  }

  /**
   * Verifies that CCM.poolFactory() returns the canonical factory address AND
   * that the pool is registered in that factory.
   *
   * Root cause of revert 0x4d13139e (InvalidPool): CCM.purchaseCoverage calls
   * this.poolFactory.isPool(pool). We must validate against the factory CCM
   * actually has stored — not a hardcoded constant — so backend pre-flight is
   * perfectly aligned with what the on-chain simulation will do.
   */
  async ensurePoolManagerCorrect(poolAddress: string): Promise<void> {
    const key = `manager:${poolAddress.toLowerCase()}`;
    if (this.poolPolicyReady.has(key)) return;

    const { publicClient } = this.buildClients();
    const pool = poolAddress as `0x${string}`;

    const ccmAddress = getCcmAddress();
    // Step 1: read the factory address CCM actually uses.
    let ccmFactory: string;
    try {
      ccmFactory = (await publicClient.readContract({
        address: ccmAddress as `0x${string}`,
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

    this.logger.info({ ccmFactory, expectedFactory: CONFIDENTIAL_POOL_FACTORY }, 'CCM.poolFactory()');

    if (ccmFactory.toLowerCase() !== CONFIDENTIAL_POOL_FACTORY.toLowerCase()) {
      throw ApplicationHttpError.internalError(
        `CCM.poolFactory() = ${ccmFactory} but expected ${CONFIDENTIAL_POOL_FACTORY}. ` +
          `Every purchaseCoverage call will revert with InvalidPool (0x4d13139e). ` +
          `Fix: call CCM.setPoolFactory(${CONFIDENTIAL_POOL_FACTORY}) from CCM owner, ` +
          `OR run: npx hardhat run scripts/diagnose-invalid-pool.ts --network arb-sepolia`,
      );
    }

    // Step 2: confirm pool is registered in the external factory registry.
    let isRegistered: boolean;
    try {
      isRegistered = await publicClient.readContract({
        address: CONFIDENTIAL_POOL_FACTORY,
        abi: POOL_FACTORY_VALIDATION_ABI,
        functionName: 'isPool',
        args: [pool],
      }) as boolean;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw ApplicationHttpError.internalError(
        `PoolFactory.isPool() read failed for pool ${poolAddress}: ${msg}. ` +
          `Cannot verify pool registration — coverage purchase blocked. ` +
          `Check RPC_URL and ConfidentialPoolFactory (${CONFIDENTIAL_POOL_FACTORY}).`,
      );
    }

    if (!isRegistered) {
      throw ApplicationHttpError.internalError(
        `Pool ${poolAddress} is NOT registered in ConfidentialPoolFactory (${CONFIDENTIAL_POOL_FACTORY}). ` +
          `CCM.purchaseCoverage will revert with InvalidPool (0x4d13139e). ` +
          `Action: deploy a new pool via ConfidentialPoolFactory.createPool(cUSDC), ` +
          `then update POOL_ADDRESS in .env and restart. ` +
          `Run: npx hardhat run scripts/repair-pool.ts --network arb-sepolia`,
      );
    }

    this.poolPolicyReady.add(key);
  }

  /**
   * Verifies CCM.escrow() and CCM.poolFactory() are set to the canonical
   * Reineira addresses. These are one-time admin calls after CCM deployment.
   *
   * Cached in memory — idempotent on contract.
   */
  async ensureCcmWired(): Promise<void> {
    const ccmAddress = getCcmAddress();
    const key = `ccm_wired:${ccmAddress.toLowerCase()}`;
    if (this.poolPolicyReady.has(key)) return;

    const { walletClient, publicClient } = this.buildClients();

    // Treat read failures as misconfigured — null means we cannot verify state.
    const [escrow, factory] = await Promise.all([
      publicClient.readContract({ address: ccmAddress as `0x${string}`, abi: CCM_ABI, functionName: 'escrow' })
        .catch((e) => { this.logger.error({ err: e instanceof Error ? e.message : e }, 'CCM.escrow() read failed'); return null; }),
      publicClient.readContract({ address: ccmAddress as `0x${string}`, abi: CCM_ABI, functionName: 'poolFactory' })
        .catch((e) => { this.logger.error({ err: e instanceof Error ? e.message : e }, 'CCM.poolFactory() read failed'); return null; }),
    ]);

    // If reads failed, do not cache — allow retry on the next request.
    if (escrow === null || factory === null) {
      this.logger.error({ ccm: ccmAddress }, 'CCM read failed — skipping wiring check, will retry next request');
      return;
    }

    this.logger.info({ escrow, factory, expectedEscrow: CONFIDENTIAL_ESCROW, expectedFactory: CONFIDENTIAL_POOL_FACTORY }, 'CCM wiring state');

    const repairErrors: string[] = [];

    if ((escrow as string).toLowerCase() !== CONFIDENTIAL_ESCROW.toLowerCase()) {
      this.logger.warn({ current: escrow, expected: CONFIDENTIAL_ESCROW }, 'CCM.escrow not set — calling setEscrow');
      try {
        const hash = await walletClient.writeContract({ address: ccmAddress as `0x${string}`, abi: CCM_ABI, functionName: 'setEscrow', args: [CONFIDENTIAL_ESCROW] });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info('CCM.setEscrow confirmed');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg }, 'CCM.setEscrow failed — manual intervention required');
        repairErrors.push(`CCM.setEscrow failed: ${msg}`);
      }
    }

    if ((factory as string).toLowerCase() !== CONFIDENTIAL_POOL_FACTORY.toLowerCase()) {
      this.logger.warn({ current: factory, expected: CONFIDENTIAL_POOL_FACTORY }, 'CCM.poolFactory not set — calling setPoolFactory');
      try {
        const hash = await walletClient.writeContract({ address: ccmAddress as `0x${string}`, abi: CCM_ABI, functionName: 'setPoolFactory', args: [CONFIDENTIAL_POOL_FACTORY] });
        await publicClient.waitForTransactionReceipt({ hash });
        this.logger.info('CCM.setPoolFactory confirmed');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: msg }, 'CCM.setPoolFactory failed — manual intervention required');
        repairErrors.push(`CCM.setPoolFactory failed: ${msg}`);
      }
    }

    // Only cache as wired when there were no unresolved failures.
    // An unresolved failure means every coverage purchase will hit InvalidPool.
    if (repairErrors.length > 0) {
      this.logger.error(
        { errors: repairErrors },
        'CCM wiring repairs failed — purchaseCoverage will revert with InvalidPool (0x4d13139e). ' +
          'Run scripts/diagnose-invalid-pool.ts and scripts/repair-pool.ts to investigate. ' +
          'The admin wallet may not own CCM — contact Reineira protocol team if setPoolFactory is unavailable.',
      );
      // Do NOT cache — allow retry, and surface the problem clearly in logs.
      return;
    }

    this.poolPolicyReady.add(key);
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
    if (this.registered.has(debtorId)) return;

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
    this.registered.add(debtorId);

    this.logger.info({ debtorId, hash }, 'Buyer registered — concentration cap set');

    // Set encrypted oracle score so evaluateRisk has a valid CoFHE ciphertext.
    // Without this, TradeCreditInsurancePolicy.evaluateRisk reverts when the CoFHE
    // TaskManager rejects the missing/invalid ciphertext from MockDebtorProof.
    const oracleAddress = env.ORACLE_DEBTOR_PROOF_ADDRESS;
    if (oracleAddress) {
      const creditScore = env.DEFAULT_DEBTOR_CREDIT_SCORE;
      try {
        await oracleService.encryptAndSetScore(oracleAddress, debtorId, creditScore);
      } catch (e) {
        // Non-fatal: log and continue. The coverage purchase will fail at evaluateRisk
        // if the score is not set, surfacing a clear ScoreNotSet revert rather than
        // an opaque CoFHE precompile error.
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
