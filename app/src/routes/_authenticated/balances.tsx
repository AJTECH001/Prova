'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { useTransactionStore } from '@/stores/transaction-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-5 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{sub}</p>}
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0 text-[var(--color-text-tertiary)]">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function BalancesPage() {
  const { balance, loading: balanceLoading, fetchBalance } = useBalance();
  const transactions = useTransactionStore((s) => s.transactions);
  const transactionLoading = useTransactionStore((s) => s.loading);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const withdrawals = useWithdrawalStore((s) => s.withdrawals);
  const fetchWithdrawals = useWithdrawalStore((s) => s.fetchWithdrawals);

  useEffect(() => {
    fetchBalance();
    fetchTransactions(true);
    fetchWithdrawals(true);
  }, [fetchBalance, fetchTransactions, fetchWithdrawals]);

  const activePayments = transactions.filter((t) =>
    ['ON_CHAIN', 'FUNDED', 'PENDING', 'PROCESSING', 'BRIDGING'].includes(t.status),
  );
  const completedPayments = transactions.filter((t) =>
    ['SETTLED', 'REDEEMED', 'COMPLETED'].includes(t.status),
  );
  const pendingWithdrawals = withdrawals.filter((w) =>
    ['PENDING', 'BRIDGING', 'PENDING_BRIDGE'].includes(w.status),
  );
  const totalInTransit = activePayments.reduce((sum, t) => sum + t.amount, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">Balances</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)]">Your account balance and fund activity</p>
      </div>

      {/* Primary balance card */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-tertiary)]">Available balance</p>
            {balanceLoading && !balance ? (
              <Skeleton className="mt-2 h-10 w-40" />
            ) : (
              <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                {balance ? balance.formatted_balance : '—'}
                <span className="ml-2 text-base font-normal text-[var(--color-text-tertiary)]">{balance?.currency ?? 'USDC'}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">Funds available to use or withdraw to your bank</p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/withdrawals">Withdraw funds</Link>
          </Button>
        </div>
      </div>

      {/* Breakdown stats */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="In active payments"
          value={`${fmt(totalInTransit)} USDC`}
          sub={`${activePayments.length} payment${activePayments.length !== 1 ? 's' : ''} in progress`}
          loading={transactionLoading && transactions.length === 0}
        />
        <StatCard
          label="Completed payments"
          value={String(completedPayments.length)}
          sub="All-time settled"
        />
        <StatCard
          label="Pending transfers"
          value={String(pendingWithdrawals.length)}
          sub={pendingWithdrawals.length > 0 ? 'Withdrawals in progress' : 'No pending transfers'}
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--color-border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Quick actions</h2>
        </div>
        <div className="flex flex-col divide-y divide-[var(--color-border-default)]">
          <Link
            href="/transactions"
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[hsl(var(--ds-surface-subtle))]"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">View transactions</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">See all your payments and their current status</p>
            </div>
            <ChevronRight />
          </Link>
          <Link
            href="/withdrawals"
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[hsl(var(--ds-surface-subtle))]"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Withdraw funds</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Transfer settled funds to your wallet</p>
            </div>
            <ChevronRight />
          </Link>
          <Link
            href="/disputes"
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[hsl(var(--ds-surface-subtle))]"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Disputes & claims</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Review overdue payments and file insurance claims</p>
            </div>
            <ChevronRight />
          </Link>
        </div>
      </div>
    </div>
  );
}
