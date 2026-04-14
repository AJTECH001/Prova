import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTransactionStore } from '@/stores/transaction-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { useBalance } from '@/hooks/use-balance';
import { TransactionList } from '@/components/features/transaction-list';
import { WithdrawalList } from '@/components/features/withdrawal-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ── Stat card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'purple';
  loading?: boolean;
}

function StatCard({ label, value, sub, icon, accent = 'blue', loading }: StatCardProps) {
  const iconBg = {
    blue: 'bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]',
    green: 'bg-[hsl(var(--tip-bg))] text-[var(--status-success)]',
    amber: 'bg-[hsl(var(--warning-bg))] text-[var(--status-warning)]',
    purple: 'bg-[hsl(var(--brand-purple-light))] text-[hsl(var(--brand-purple))]',
  }[accent];

  const valueColor = {
    blue: 'text-[var(--text-primary)]',
    green: 'text-[var(--status-success)]',
    amber: 'text-[var(--status-warning)]',
    purple: 'text-[hsl(var(--brand-purple))]',
  }[accent];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-subtle)] ${iconBg}`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <div>
          <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</p>}
        </div>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-blue-bg)]">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--accent-blue)">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Dashboard page ──────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const transactionLoading = useTransactionStore((s) => s.loading);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const withdrawals = useWithdrawalStore((s) => s.withdrawals);
  const withdrawalLoading = useWithdrawalStore((s) => s.loading);
  const fetchWithdrawals = useWithdrawalStore((s) => s.fetchWithdrawals);
  const { balance, loading: balanceLoading, startPolling, stopPolling } = useBalance();

  useEffect(() => {
    fetchTransactions(true);
    fetchWithdrawals(true);
    startPolling();
    return () => stopPolling();
  }, [fetchTransactions, fetchWithdrawals, startPolling, stopPolling]);

  function handleSelectTransaction(transaction: { public_id: string }) {
    navigate({ to: '/transactions/$id', params: { id: transaction.public_id } });
  }

  // Derived stats
  const activeEscrows = transactions.filter((t) =>
    ['PENDING', 'ON_CHAIN', 'PROCESSING'].includes(t.status),
  ).length;
  const settledEscrows = transactions.filter((t) =>
    ['SETTLED', 'REDEEMED'].includes(t.status),
  ).length;
  const activeWithdrawals = withdrawals.filter((w) =>
    ['PENDING_REDEEM', 'PENDING_BRIDGE', 'BRIDGING'].includes(w.status),
  ).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Overview</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/withdrawals">New Withdrawal</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/transactions">New Transaction</Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Available Balance"
          value={balance ? `${balance.formatted_balance} ${balance.currency}` : '—'}
          sub="Live balance"
          loading={balanceLoading && !balance}
          accent="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Active Escrows"
          value={transactionLoading && transactions.length === 0 ? '—' : activeEscrows}
          sub="Pending settlement"
          loading={transactionLoading && transactions.length === 0}
          accent="amber"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Settled Escrows"
          value={transactionLoading && transactions.length === 0 ? '—' : settledEscrows}
          sub="Completed"
          loading={transactionLoading && transactions.length === 0}
          accent="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Active Withdrawals"
          value={withdrawalLoading && withdrawals.length === 0 ? '—' : activeWithdrawals}
          sub="In bridge / redeem"
          loading={withdrawalLoading && withdrawals.length === 0}
          accent="purple"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Activity */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent transactions */}
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[var(--border-dark)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
              <p className="text-xs text-[var(--text-muted)]">Latest escrow activity</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-medium text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="px-5 py-4">
            {transactions.length === 0 && !transactionLoading ? (
              <EmptyState
                title="No transactions yet"
                desc="Create your first escrow to get started"
                action={
                  <Button size="sm" asChild>
                    <Link to="/transactions">New Transaction</Link>
                  </Button>
                }
              />
            ) : (
              <TransactionList
                transactions={transactions.slice(0, 5)}
                loading={transactionLoading}
                hasMore={false}
                onSelect={handleSelectTransaction}
              />
            )}
          </div>
        </div>

        {/* Recent withdrawals */}
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[var(--border-dark)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Withdrawals</h2>
              <p className="text-xs text-[var(--text-muted)]">Bridge and redeem history</p>
            </div>
            <Link
              to="/withdrawals"
              className="text-xs font-medium text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="px-5 py-4">
            {withdrawals.length === 0 && !withdrawalLoading ? (
              <EmptyState
                title="No withdrawals yet"
                desc="Redeem a settled escrow to withdraw funds"
                action={
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/withdrawals">New Withdrawal</Link>
                  </Button>
                }
              />
            ) : (
              <WithdrawalList withdrawals={withdrawals.slice(0, 5)} loading={withdrawalLoading} hasMore={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
