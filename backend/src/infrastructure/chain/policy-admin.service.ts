import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { getEnv } from '../../core/config.js';
import { getLogger } from '../../core/logger.js';
import { ApplicationHttpError } from '../../core/errors.js';

const POLICY_ABI = parseAbi([
  'function setConcentrationCap(bytes32 debtorId, uint64 cap) external',
]);

const POLICY_REGISTRY_ABI = parseAbi([
  'function isPolicy(address) view returns (bool)',
  'function registerPolicy(address policy_) returns (uint256 policyId)',
]);

const INSURANCE_POOL_ABI = parseAbi([
  'function isPolicy(address) view returns (bool)',
  'function addPolicy(address policy_) external',
]);

// ConfidentialPolicyRegistry — Reineira core, Arbitrum Sepolia
const POLICY_REGISTRY_ADDRESS = '0x962A6c7Be4fC765B0E8B601ab4BB210938660190' as const;

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
  }
}
