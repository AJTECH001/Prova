import { useCallback, useEffect, useState } from 'react';
import { BalanceService, type BalanceResponse } from '@/services/BalanceService';
import { usePolling } from '@/hooks/use-polling';
import { useRefreshStore } from '@/stores/refresh-store';

export function useBalance(pollingInterval = 10000) {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balanceRefreshKey = useRefreshStore((s) => s.balanceRefreshKey);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BalanceService.getBalance();
      setBalance(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch balance';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const { isPolling, start, stop } = usePolling(fetchBalance, pollingInterval);

  // re-fetch immediately whenever the unstake/withdrawal flow signals a balance change
  useEffect(() => {
    if (balanceRefreshKey > 0) fetchBalance();
  }, [balanceRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = useCallback(async () => {
    await fetchBalance();
    start();
  }, [fetchBalance, start]);

  return { balance, loading, error, isPolling, fetchBalance, startPolling, stopPolling: stop };
}
