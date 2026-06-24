import type { TransactionResponse } from '@/services/TransactionService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isClaimEligible } from '@/hooks/use-claim-eligibility';

interface TransactionListProps {
  transactions: TransactionResponse[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  onSelect?: (transaction: TransactionResponse) => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    SETTLED: 'success',
    COMPLETED: 'success',
    REDEEMED: 'success',
    FUNDED: 'success',
    PENDING: 'warning',
    PENDING_REDEEM: 'warning',
    PENDING_BRIDGE: 'warning',
    PROCESSING: 'warning',
    BRIDGING: 'warning',
    ON_CHAIN: 'info',
    ISSUED: 'info',
    DRAFT: 'info',
    CREATED: 'info',
    FAILED: 'error',
    CANCELED: 'error',
    CANCELLED: 'error',
    EXPIRED: 'error',
    OVERDUE: 'error',
  };
  return map[status] ?? 'default';
}

function friendlyStatus(status: string): string {
  const map: Record<string, string> = {
    SETTLED: 'Settled',
    COMPLETED: 'Completed',
    REDEEMED: 'Withdrawn',
    FUNDED: 'Paid',
    PENDING: 'Awaiting Payment',
    PENDING_REDEEM: 'Ready to Redeem',
    PENDING_BRIDGE: 'Pending Transfer',
    PROCESSING: 'Processing',
    BRIDGING: 'Transferring',
    ON_CHAIN: 'Awaiting Payment',
    ISSUED: 'Issued',
    DRAFT: 'Draft',
    CREATED: 'Created',
    FAILED: 'Failed',
    CANCELED: 'Cancelled',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    OVERDUE: 'Overdue',
  };
  return map[status] ?? status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `••••${addr.slice(-4).toUpperCase()}`;
}

export function TransactionList({ transactions, loading, hasMore, onLoadMore, onSelect }: TransactionListProps) {
  const skeletonRows = Array.from({ length: 4 });

  return (
    <div>
      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden flex flex-col divide-y divide-[var(--color-border-default)]">
        {loading && transactions.length === 0
          ? skeletonRows.map((_, i) => (
              <div key={i} className="py-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          : transactions.map((tx) => (
              <button
                key={tx.public_id}
                onClick={() => onSelect?.(tx)}
                className="w-full text-left py-4 active:bg-[hsl(var(--ds-surface-subtle))] transition-colors focus:outline-none focus-visible:bg-[hsl(var(--ds-surface-subtle))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {tx.external_reference || <span className="text-[var(--color-text-tertiary)] font-normal">No reference</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                      To account {shortAddr(tx.counterparty)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">
                      {formatAmount(tx.amount)}{' '}
                      <span className="text-xs font-normal text-[var(--color-text-tertiary)]">USDC</span>
                    </p>
                    <Badge variant={statusVariant(tx.status)}>{friendlyStatus(tx.status)}</Badge>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Due {formatDate(tx.deadline)}</p>
                  {isClaimEligible(tx) && (
                    <Badge variant="warning">Claim Ready</Badge>
                  )}
                </div>
              </button>
            ))}

        {!loading && transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No payments yet</p>
        )}
      </div>

      {/* ── Desktop table (hidden on mobile) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)]">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Reference</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Recipient</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Amount</th>
              <th className="hidden pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] md:table-cell">Due Date</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Status</th>
              <th className="hidden pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0
              ? skeletonRows.map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-default)]">
                    <td className="py-3 pr-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 pr-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="hidden py-3 pr-4 md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 pr-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="hidden py-3 lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              : transactions.map((tx) => (
                  <tr
                    key={tx.public_id}
                    className="border-b border-[var(--color-border-default)] last:border-0 cursor-pointer hover:bg-[hsl(var(--ds-surface-subtle))] transition-colors"
                    onClick={() => onSelect?.(tx)}
                  >
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {tx.external_reference || <span className="text-[var(--color-text-tertiary)]">—</span>}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-xs text-[var(--color-text-secondary)]">Account {shortAddr(tx.counterparty)}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">{formatAmount(tx.amount)}</span>
                      <span className="ml-1 text-xs font-normal text-[var(--color-text-tertiary)]">USDC</span>
                    </td>
                    <td className="hidden py-3.5 pr-4 text-sm text-[var(--color-text-secondary)] md:table-cell">{formatDate(tx.deadline)}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant(tx.status)}>{friendlyStatus(tx.status)}</Badge>
                        {isClaimEligible(tx) && <Badge variant="warning">Claim Ready</Badge>}
                      </div>
                    </td>
                    <td className="hidden py-3.5 text-sm text-[var(--color-text-secondary)] lg:table-cell">{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No payments yet</p>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" loading={loading} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
