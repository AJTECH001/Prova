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

// Wraps ZeroDev passkey server fetch errors into clear messages.
// The SDK swallows HTTP errors — we patch fetch to catch 401/403 early.
function passkeyErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'Passkey server not authorized. Enable the Passkey Server feature for this project in the ZeroDev dashboard (dashboard.zerodev.app).';
  }
  return `Passkey server error (HTTP ${status}). Check your VITE_ZERODEV_PASSKEY_SERVER_URL.`;
}

async function fetchWithPasskeyErrorHandling(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok && String(input).includes('passkeys.zerodev.app')) {
    throw new Error(passkeyErrorMessage(res.status));
  }
  return res;
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

    let webAuthnKey: WebAuthnKey;
    try {
      webAuthnKey = await toWebAuthnKey({
        passkeyName: username,
        passkeyServerUrl: requireEnv('VITE_ZERODEV_PASSKEY_SERVER_URL'),
        mode: WebAuthnMode.Register,
        passkeyServerHeaders: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof TypeError && String(e.message).toLowerCase().includes('fetch')) {
        throw new Error('Cannot reach passkey server. Check VITE_ZERODEV_PASSKEY_SERVER_URL in your .env file.');
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

    let webAuthnKey: WebAuthnKey;
    try {
      webAuthnKey = await toWebAuthnKey({
        passkeyName: '',
        passkeyServerUrl: requireEnv('VITE_ZERODEV_PASSKEY_SERVER_URL'),
        mode: WebAuthnMode.Login,
        passkeyServerHeaders: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof TypeError && String(e.message).toLowerCase().includes('fetch')) {
        throw new Error('Cannot reach passkey server. Check VITE_ZERODEV_PASSKEY_SERVER_URL in your .env file.');
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

    const callData = await this.kernelClient.account.encodeCalls(
      calls.map((c) => ({
        to: c.to as Hex,
        data: c.data as Hex,
        value: c.value ?? 0n,
      })),
    );

    const userOpHash = await this.kernelClient.sendUserOperation({ callData });
    const receipt = await this.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return receipt.receipt.transactionHash;
  }
}
