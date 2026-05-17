'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactionStore } from '@/stores/transaction-store';
import { isClaimEligible } from '@/hooks/use-claim-eligibility';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionResponse } from '@/services/TransactionService';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `••••${addr.slice(-4).toUpperCase()}`;
}

function DisputeRow({ tx, onView }: { tx: TransactionResponse; onView: () => void }) {
  const hasCoverage = !!tx.coverage_id;
  const daysPast = tx.deadline
    ? Math.max(0, Math.floor((Date.now() - new Date(tx.deadline).getTime()) / 86_400_000))
    : 0;

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-dark)] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {tx.external_reference || `Payment #${tx.public_id.slice(0, 8)}`}
          </p>
          {hasCoverage ? (
            <Badge variant="success">Insured</Badge>
          ) : (
            <Badge variant="error">No coverage</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          From <span className="font-mono">{shortAddr(tx.counterparty)}</span>
          {' · '}Due {formatDate(tx.deadline)}
          {' · '}{daysPast} day{daysPast !== 1 ? 's' : ''} overdue
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
          {formatAmount(tx.amount)}{' '}
          <span className="text-xs font-normal text-[var(--text-muted)]">USDC</span>
        </p>
        <Button
          size="sm"
          variant={hasCoverage ? 'primary' : 'secondary'}
          onClick={onView}
        >
          {hasCoverage ? 'File Claim' : 'View'}
        </Button>
      </div>
    </div>
  );
}

export function DisputesPage() {
  const router = useRouter();
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  const disputes = transactions.filter((t) => isClaimEligible(t));
  const withCoverage = disputes.filter((t) => !!t.coverage_id);
  const withoutCoverage = disputes.filter((t) => !t.coverage_id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">Disputes</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Payments where the buyer has not paid within the agreed timeframe
        </p>
      </div>

      {/* Summary chips — only when there are disputes */}
      {disputes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-xl border border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-bg))] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-warning)]">Claimable</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{withCoverage.length}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Insured payments ready to claim</p>
          </div>
          <div className="rounded-xl border border-[var(--border-dark)] bg-white px-5 py-4 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Uninsured</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{withoutCoverage.length}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Payments without coverage</p>
          </div>
        </div>
      )}

      {/* Claim action banner */}
      {withCoverage.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--status-success)] bg-[hsl(var(--tip-bg))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 shrink-0 text-[var(--status-success)]">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[var(--status-success)]">
                {withCoverage.length} insured payment{withCoverage.length !== 1 ? 's' : ''} ready to claim
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Go to Withdrawals to file an insurance claim and recover your funds.
              </p>
            </div>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/withdrawals">File Claims</Link>
          </Button>
        </div>
      )}

      {/* Dispute list */}
      <div className="rounded-xl border border-[var(--border-dark)] bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border-dark)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Overdue Payments</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {disputes.length > 0
              ? `${disputes.length} payment${disputes.length !== 1 ? 's' : ''} past their due date`
              : 'No overdue payments'}
          </p>
        </div>
        <div className="px-5">
          {loading && transactions.length === 0 ? (
            <div className="flex flex-col py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 border-b border-[var(--border-dark)] py-4 last:border-0">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--tip-bg))]">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--status-success)]">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No disputes</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">All your payments are within their agreed timeframes</p>
              <Button size="sm" variant="secondary" asChild className="mt-4">
                <Link href="/transactions">View all payments</Link>
              </Button>
            </div>
          ) : (
            disputes.map((tx) => (
              <DisputeRow
                key={tx.public_id}
                tx={tx}
                onView={() =>
                  router.push(tx.coverage_id ? '/withdrawals' : `/transactions/${tx.public_id}`)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
