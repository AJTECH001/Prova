import { useCallback, useEffect, useState } from 'react';
import { publicClient } from '@/lib/public-client';
import { fheService } from '@/services/FheService';
import { cUSDCABI, ADDRESSES } from '@/lib/contracts';
import { usePolling } from '@/hooks/use-polling';
import { useRefreshStore } from '@/stores/refresh-store';
import { useWalletStore } from '@/stores/wallet-store';

const ZERO_HANDLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface CUsdcBalance {
  /** Plain USDC-equivalent units (6 decimals) */
  raw: bigint;
  /** Human-readable string, e.g. "1234.56" */
  formatted: string;
}

function formatUnits(raw: bigint, decimals = 6): string {
  const str = raw.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const frac  = str.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export function useCUsdcBalance(walletAddress: string | null, pollingInterval = 15000) {
  const [balance, setBalance]   = useState<CUsdcBalance | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const balanceRefreshKey = useRefreshStore((s) => s.balanceRefreshKey);
  // Re-fetch whenever the wallet (re)connects — walletStoreAddress becomes non-null
  // after ensureConnected() resolves, giving us the real kernel client for decryption.
  const walletStoreAddress = useWalletStore((s) => s.address);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;

    // getViemWalletClient() returns null until the user performs a wallet action
    // in the current session (kernelClient is not persisted across page loads).
    // Skip silently rather than failing — the refresh-store trigger fires after
    // stake/unstake when the wallet IS live.
    const viemWalletClient = useWalletStore.getState().getViemWalletClient();
    if (!viemWalletClient) return;

    setLoading(true);
    setError(null);
    try {
      // 1. read the encrypted balance handle from cUSDC
      const ctHash = await publicClient.readContract({
        address: ADDRESSES.cUSDC as `0x${string}`,
        abi: cUSDCABI,
        functionName: 'confidentialBalanceOf',
        args: [walletAddress as `0x${string}`],
      });

      // 2. zero handle means no cUSDC balance — skip costly decryption
      if ((ctHash as string) === ZERO_HANDLE) {
        setBalance({ raw: 0n, formatted: '0' });
        return;
      }

      // 3. decrypt via cofhejs threshold network
      await fheService.initialize(walletAddress, viemWalletClient);
      const raw = await fheService.decryptUint64(BigInt(ctHash as string));

      setBalance({ raw, formatted: formatUnits(raw) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch cUSDC balance');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const { isPolling, start, stop } = usePolling(fetchBalance, pollingInterval);

  // re-fetch immediately whenever the unstake/withdrawal flow signals a balance change
  useEffect(() => {
    if (balanceRefreshKey > 0) fetchBalance();
  }, [balanceRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // re-fetch when the wallet reconnects (walletStoreAddress goes from null → address)
  // This is the trigger for the post-reload path: layout fires ensureConnected(),
  // which sets walletStore.address, which fires this effect with the kernel client ready.
  useEffect(() => {
    if (walletStoreAddress && walletAddress) fetchBalance();
  }, [walletStoreAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = useCallback(async () => {
    await fetchBalance();
    start();
  }, [fetchBalance, start]);

  return { balance, loading, error, isPolling, fetchBalance, startPolling, stopPolling: stop };
}
