import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { getEnv } from '../../core/config.js';
import { getLogger } from '../../core/logger.js';

const ORACLE_ABI = parseAbi([
  'function setScore(bytes32 debtorId, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encScore) external',
  'function hasScore(bytes32 debtorId) external view returns (bool)',
  'function oracle() external view returns (address)',
]);

const logger = getLogger('OracleService');

/**
 * Service that encrypts credit scores via CoFHE and submits them to OracleDebtorProof.
 *
 * The production flow:
 *  1. Backend calls encryptAndSetScore(oracleAddr, debtorId, score) before coverage.
 *  2. CoFHE SDK encrypts the uint32 score using the Arbitrum Sepolia CoFHE network.
 *  3. setScore(debtorId, InEuint32{ctHash, sig}) is submitted on-chain.
 *  4. On-chain: FHE.asEuint32(InEuint32) validates signature via CoFHE TaskManager.
 *  5. Verified euint32 handle is stored — policy can now evaluate risk FHE-side.
 */
export class OracleService {
  private readonly logger = getLogger('OracleService');

  // Debtor IDs for which scores have been set in this process — skip duplicates.
  private readonly scored = new Set<string>();

  // Lazy CoFHE client — initialized on first use to avoid startup overhead.
  private cofheClient: any = null;

  private buildClients() {
    const env = getEnv();
    if (!env.ADMIN_PRIVATE_KEY) {
      throw new Error('ADMIN_PRIVATE_KEY is not configured — cannot submit oracle scores');
    }
    if (!env.RPC_URL) {
      throw new Error('RPC_URL is not configured');
    }

    const account = privateKeyToAccount(env.ADMIN_PRIVATE_KEY as Hex);
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

  private async ensureCofheClient() {
    if (this.cofheClient) return this.cofheClient;

    const env = getEnv();
    const rpcUrl = env.RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc';

    // Lazily import to avoid loading the large WASM/TFHE module at startup.
    const { createCofheConfig, createCofheClient } = await import('@cofhe/sdk/node');
    const { arbSepolia } = await import('@cofhe/sdk/chains');
    const adapters = await import('@cofhe/sdk/adapters');
    const WagmiAdapter = (adapters as any).WagmiAdapter ?? (adapters as any).default?.WagmiAdapter;

    const account = privateKeyToAccount((env.ADMIN_PRIVATE_KEY ?? '0x' + '0'.repeat(64)) as Hex);
    const viemPublicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });
    const viemWalletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    const cofheConfig = createCofheConfig({ supportedChains: [arbSepolia] });
    const client = createCofheClient(cofheConfig);

    const { publicClient: cofhePublic, walletClient: cofheWallet } =
      await WagmiAdapter(viemWalletClient, viemPublicClient);
    await client.connect(cofhePublic, cofheWallet);

    this.cofheClient = client;
    this.logger.info('CoFHE client initialized');
    return this.cofheClient;
  }

  /**
   * Check on-chain whether the oracle already has a score for this debtorId.
   * Use for pre-flight validation before building a UserOperation.
   */
  async hasScore(oracleAddress: string, debtorId: `0x${string}`): Promise<boolean> {
    const { publicClient } = this.buildClients();
    return publicClient.readContract({
      address: oracleAddress as Hex,
      abi: ORACLE_ABI,
      functionName: 'hasScore',
      args: [debtorId],
    }) as Promise<boolean>;
  }

  /**
   * Encrypt score via CoFHE and call OracleDebtorProof.setScore.
   * Idempotent per process — skips if already submitted this session.
   * Pass force=true to re-submit regardless of cache.
   */
  async encryptAndSetScore(
    oracleAddress: string,
    debtorId: `0x${string}`,
    score: number,
    force = false,
  ): Promise<void> {
    if (!force && this.scored.has(debtorId)) return;

    this.logger.info({ debtorId, score, oracleAddress }, 'Encrypting and setting oracle score');

    const cofheClient = await this.ensureCofheClient();
    const { Encryptable } = await import('@cofhe/sdk');

    const [encResult] = await cofheClient.encryptInputs([Encryptable.uint32(BigInt(score))]).execute();

    if (!encResult.ctHash || encResult.ctHash === 0n) {
      throw new Error('CoFHE encryption returned zero ctHash — client not properly connected');
    }
    if (!encResult.signature || encResult.signature.length === 0) {
      throw new Error('CoFHE encryption returned empty signature — inputProof missing');
    }

    this.logger.debug(
      { debtorId, ctHash: encResult.ctHash.toString(), sigLen: encResult.signature.length },
      'Score encrypted — submitting on-chain',
    );

    const { walletClient, publicClient } = this.buildClients();

    const hash = await walletClient.writeContract({
      address: oracleAddress as Hex,
      abi: ORACLE_ABI,
      functionName: 'setScore',
      args: [
        debtorId,
        {
          ctHash:       encResult.ctHash,
          securityZone: encResult.securityZone,
          utype:        encResult.utype,
          signature:    encResult.signature as Hex,
        },
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    this.scored.add(debtorId);

    this.logger.info({ debtorId, hash }, 'Oracle score set on-chain');
  }
}

export const oracleService = new OracleService();
