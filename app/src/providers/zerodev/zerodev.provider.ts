import type { IWalletProvider, Call } from '../wallet-provider.interface';
import { toWebAuthnKey, WebAuthnMode, type WebAuthnKey } from '@zerodev/webauthn-key';
import { toPasskeyValidator, PasskeyValidatorContractVersion } from '@zerodev/passkey-validator';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, constants } from '@zerodev/sdk';
import type { KernelAccountClient } from '@zerodev/sdk';
import { createPublicClient, http, type Hex } from 'viem';
import { signMessage as viemSignMessage } from 'viem/actions';
import { arbitrumSepolia } from 'viem/chains';
import { entryPoint07Address } from 'viem/account-abstraction';
import { WindowHelper } from '@/helpers/WindowHelper';

const ENTRY_POINT = { address: entryPoint07Address, version: '0.7' as const };
const KERNEL_VERSION = constants.KERNEL_V3_1;

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

// Pre-flight check: attempt a no-cors fetch to tell apart "server unreachable"
// from "CORS blocked" (which ZeroDev returns when Passkey Server is disabled).
async function checkPasskeyServer(url: string): Promise<void> {
  try {
    // no-cors succeeds with an opaque response if the server is up and reachable.
    const res = await fetch(url, { method: 'GET', mode: 'no-cors' });
    if (res.type === 'opaque') return; // reachable — CORS will be handled by the SDK
  } catch {
    throw new Error(
      'Cannot reach the ZeroDev passkey server. Possible causes:\n' +
      '1. The Passkey Server feature is not enabled for this project in the ZeroDev dashboard (dashboard.zerodev.app).\n' +
      '2. Check that VITE_ZERODEV_PASSKEY_SERVER_URL is set correctly.',
    );
  }
}

function getChain() {
  return arbitrumSepolia;
}

// Public client uses the standard chain RPC — NOT the bundler URL.
// The bundler URL only handles ERC-4337 methods; the public client needs eth_ methods.
function buildPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(requireEnv('VITE_COFHE_RPC_URL')),
  });
}

async function buildKernelClient(webAuthnKey: WebAuthnKey): Promise<KernelAccountClient> {
  const publicClient = buildPublicClient();
  const chain = getChain();
  const bundlerUrl = requireEnv('VITE_ZERODEV_BUNDLER_URL');
  const paymasterUrl = requireEnv('VITE_ZERODEV_PAYMASTER_URL');

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });

  // Paymaster uses its own dedicated URL — separate from the bundler
  const paymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(paymasterUrl),
  });

  return createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster,
  });
}

export class ZeroDevProvider implements IWalletProvider {
  private kernelClient: KernelAccountClient | null = null;
  private webAuthnKeyRef: WebAuthnKey | null = null;
  private _address: string | null = null;

  async connect(): Promise<string> {
    return this.login();
  }

  async register(username: string): Promise<string> {
    await WindowHelper.ensureFocus();

    const passkeyServerUrl = requireEnv('VITE_ZERODEV_PASSKEY_SERVER_URL');
    await checkPasskeyServer(passkeyServerUrl);

    let webAuthnKey: WebAuthnKey;
    try {
      webAuthnKey = await toWebAuthnKey({
        passkeyName: username,
        passkeyServerUrl,
        mode: WebAuthnMode.Register,
        passkeyServerHeaders: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof TypeError && String(e.message).toLowerCase().includes('fetch')) {
        throw new Error('Passkey registration failed. Ensure the Passkey Server feature is enabled in the ZeroDev dashboard (dashboard.zerodev.app).');
      }
      throw e;
    }

    this.kernelClient = await buildKernelClient(webAuthnKey);
    this.webAuthnKeyRef = webAuthnKey;

    if (!this.kernelClient.account) throw new Error('Kernel account not initialised');

    this._address = this.kernelClient.account.address;
    return this._address;
  }

  async login(): Promise<string> {
    await WindowHelper.ensureFocus();

    const passkeyServerUrl = requireEnv('VITE_ZERODEV_PASSKEY_SERVER_URL');
    await checkPasskeyServer(passkeyServerUrl);

    let webAuthnKey: WebAuthnKey;
    try {
      webAuthnKey = await toWebAuthnKey({
        passkeyName: '',
        passkeyServerUrl,
        mode: WebAuthnMode.Login,
        passkeyServerHeaders: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof TypeError && String(e.message).toLowerCase().includes('fetch')) {
        throw new Error('Passkey login failed. Ensure the Passkey Server feature is enabled in the ZeroDev dashboard (dashboard.zerodev.app).');
      }
      throw e;
    }

    this.kernelClient = await buildKernelClient(webAuthnKey);
    this.webAuthnKeyRef = webAuthnKey;

    if (!this.kernelClient.account) throw new Error('Kernel account not initialised');

    this._address = this.kernelClient.account.address;
    return this._address;
  }

  async disconnect(): Promise<void> {
    this.kernelClient = null;
    this.webAuthnKeyRef = null;
    this._address = null;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.kernelClient?.account) throw new Error('Not connected');
    await WindowHelper.ensureFocus();
    return viemSignMessage(this.kernelClient, {
      account: this.kernelClient.account,
      message,
    });
  }

  getAddress(): string | null {
    return this._address;
  }

  isConnected(): boolean {
    return this._address !== null && this.kernelClient !== null;
  }

  async sendUserOperation(calls: Call[]): Promise<string> {
    if (!this.kernelClient?.account) throw new Error('Not connected');

    const encodeCalls = async () =>
      this.kernelClient!.account!.encodeCalls(
        calls.map((c) => ({ to: c.to as Hex, data: c.data as Hex, value: c.value ?? 0n })),
      );

    const attempt = async (): Promise<string> => {
      const callData = await encodeCalls();
      const userOpHash = await this.kernelClient!.sendUserOperation({ callData });
      const receipt = await this.kernelClient!.waitForUserOperationReceipt({ hash: userOpHash });
      return receipt.receipt.transactionHash;
    };

    try {
      return await attempt();
    } catch (e: any) {
      // AA25 means the bundler rejected the UserOp due to a stale nonce (prior tx advanced
      // the on-chain nonce but the kernelClient still holds the old value). Rebuild the
      // client so it re-fetches the current nonce, then retry once.
      if (e?.message?.includes('AA25') && this.webAuthnKeyRef) {
        this.kernelClient = await buildKernelClient(this.webAuthnKeyRef);
        return await attempt();
      }
      throw e;
    }
  }
}
