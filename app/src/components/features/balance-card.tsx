import { useEffect } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

export function BalanceCard() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { balance, loading, startPolling, stopPolling } = useBalance();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const truncated = walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : '—';

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-block)] bg-[var(--accent-blue)] p-6 text-white shadow-[var(--shadow-lg)]">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/30" />
        <div className="absolute -bottom-12 -left-4 h-40 w-40 rounded-full bg-white/20" />
      </div>

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">Available Balance</p>
          {loading && !balance ? (
            <Skeleton className="mt-2 h-10 w-44 bg-white/20" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {balance?.formatted_balance ?? '0.00'}
              </span>
              <span className="text-lg font-medium text-white/70">
                {balance?.currency ?? 'USDC'}
              </span>
            </div>
          )}
          <p className="mt-2 text-xs text-white/50">Updates in real time</p>
        </div>

        <div className="shrink-0 rounded-[var(--radius-subtle)] bg-white/10 px-4 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/60">Wallet</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-white">{truncated}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/60">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
