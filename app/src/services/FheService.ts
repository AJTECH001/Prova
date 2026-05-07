import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

interface EncryptedInput {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: string;
}

export interface FheEncryptResult {
  data: string;
  securityZone: number;
  utype: number;
  inputProof: string;
}

class FheService {
  private client: any = null;
  private initPromise: Promise<void> | null = null;
  private currentAddress: string | null = null;
  private hasRealWalletClient = false;

  async initialize(walletAddress: string, viemWalletClient?: unknown): Promise<void> {
    const normalized = walletAddress.toLowerCase();
    const needsReal = !!viemWalletClient;

    // Cache hit — address matches AND capability satisfies the caller's requirement
    if (this.client && this.currentAddress === normalized && (!needsReal || this.hasRealWalletClient)) {
      return;
    }

    // Real client requested but we only cached the fake one — bust the cache and re-init
    if (this.client && this.currentAddress === normalized && needsReal && !this.hasRealWalletClient) {
      this.client = null;
      this.initPromise = null;
      this.hasRealWalletClient = false;
    }

    if (this.initPromise) {
      await this.initPromise;
      if (this.client && this.currentAddress === normalized && (!needsReal || this.hasRealWalletClient)) {
        return;
      }
    }

    this.initPromise = this.doInitialize(normalized, viemWalletClient);
    await this.initPromise;
  }

  async encryptAddress(address: string): Promise<FheEncryptResult> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');
    const encryptable = Encryptable.address(address);
    const result = await this.client.encryptInputs([encryptable]).execute();

    if (!result || result.length === 0) {
      throw new Error('Encryption failed: no result returned');
    }

    return this.formatResult(result[0] as EncryptedInput);
  }

  async encryptUint64(value: bigint): Promise<FheEncryptResult> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');
    const encryptable = Encryptable.uint64(value);
    const result = await this.client.encryptInputs([encryptable]).execute();

    if (!result || result.length === 0) {
      throw new Error('Encryption failed: no result returned');
    }

    return this.formatResult(result[0] as EncryptedInput);
  }

  async encryptBatch(
    items: Array<{ type: 'eaddress' | 'euint64'; value: string | bigint }>,
  ): Promise<FheEncryptResult[]> {
    this.assertReady();
    const { Encryptable } = await import('@cofhe/sdk');

    const encryptables = items.map((item) => {
      if (item.type === 'eaddress') {
        return Encryptable.address(String(item.value));
      }
      return Encryptable.uint64(BigInt(item.value));
    });

    const result = await this.client.encryptInputs(encryptables).execute();

    if (!result) {
      throw new Error('Batch encryption failed: no result returned');
    }

    return (result as EncryptedInput[]).map((enc) => this.formatResult(enc));
  }

  async decryptUint64(ctHash: bigint): Promise<bigint> {
    this.assertReady();
    const { FheTypes } = await import('@cofhe/sdk');
    // ensure a self-permit exists for the connected account before decrypting
    await this.client.permits.getOrCreateSelfPermit();
    return this.client
      .decryptForView(ctHash, FheTypes.Uint64)
      .withPermit()
      .execute() as Promise<bigint>;
  }

  isReady(): boolean {
    return this.client !== null;
  }

  private assertReady(): void {
    if (!this.client) {
      throw new Error('FHE service not initialized — call initialize() first');
    }
  }

  private async doInitialize(address: string, realWalletClient?: unknown): Promise<void> {
    try {
      const { createCofheConfig, createCofheClient } = await import('@cofhe/sdk/web');
      const { arbSepolia } = await import('@cofhe/sdk/chains');
      const adapters = await import('@cofhe/sdk/adapters');
      const WagmiAdapter = adapters.WagmiAdapter ?? (adapters as any).default?.WagmiAdapter;

      const rpcUrl = import.meta.env.VITE_COFHE_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

      const viemPublicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
      });

      // Use the real wallet client (ZeroDev kernel) when provided — required for permit
      // signing during decryption. Encryption-only flows can pass undefined and get the
      // minimal fake client that handles eth_accounts only.
      const walletClientForSdk = realWalletClient ?? createWalletClient({
        account: address as `0x${string}`,
        chain: arbitrumSepolia,
        transport: custom({
          async request({ method }: { method: string }) {
            if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
              return [address];
            }
            throw new Error(`Unsupported method: ${method}`);
          },
        }),
      });

      const sdkConfig = createCofheConfig({
        supportedChains: [arbSepolia],
      });

      this.client = createCofheClient(sdkConfig);

      const { publicClient, walletClient } = await WagmiAdapter(walletClientForSdk as any, viemPublicClient);
      await this.client.connect(publicClient, walletClient);

      this.currentAddress = address;
      this.hasRealWalletClient = !!realWalletClient;
    } catch (error: any) {
      this.client = null;
      this.initPromise = null;
      this.hasRealWalletClient = false;
      const message = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`FHE initialization failed: ${message}`);
    }
  }

  private formatResult(encrypted: EncryptedInput): FheEncryptResult {
    return {
      data: '0x' + encrypted.ctHash.toString(16).padStart(64, '0'),
      securityZone: encrypted.securityZone,
      utype: encrypted.utype,
      inputProof: encrypted.signature,
    };
  }
}

export const fheService = new FheService();
