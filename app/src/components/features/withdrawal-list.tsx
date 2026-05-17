import type { WithdrawalResponse } from '@/services/WithdrawalService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface WithdrawalListProps {
  withdrawals: WithdrawalResponse[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    COMPLETED: 'success',
    REDEEMED: 'success',
    PAID: 'success',
    PENDING: 'warning',
    PENDING_REDEEM: 'warning',
    PENDING_BRIDGE: 'warning',
    PROCESSING: 'warning',
    BRIDGING: 'warning',
    ISSUED: 'info',
    DRAFT: 'info',
    FAILED: 'error',
    CANCELED: 'error',
    CANCELLED: 'error',
    OVERDUE: 'error',
  };
  return map[status] ?? 'default';
}

function friendlyStatus(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'Completed',
    REDEEMED: 'Withdrawn',
    PAID: 'Paid',
    PENDING: 'Pending',
    PENDING_REDEEM: 'Ready to Redeem',
    PENDING_BRIDGE: 'Pending Transfer',
    PROCESSING: 'Processing',
    BRIDGING: 'Transferring',
    ISSUED: 'Issued',
    DRAFT: 'Draft',
    FAILED: 'Failed',
    CANCELED: 'Cancelled',
    CANCELLED: 'Cancelled',
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

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WithdrawalList({ withdrawals, loading, hasMore, onLoadMore }: WithdrawalListProps) {
  const skeletonRows = Array.from({ length: 4 });

  return (
    <div>
      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden flex flex-col divide-y divide-[var(--border-dark)]">
        {loading && withdrawals.length === 0
          ? skeletonRows.map((_, i) => (
              <div key={i} className="py-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          : withdrawals.map((w) => (
              <div key={w.public_id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {formatAmount(w.actual_amount ?? w.estimated_amount)}{' '}
                      <span className="text-xs font-normal text-[var(--text-muted)]">USDC</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] capitalize">
                      {w.destination_chain} · {truncateAddress(w.recipient_address)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(w.status)}>{friendlyStatus(w.status)}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">{formatDate(w.created_at)}</p>
              </div>
            ))}

        {!loading && withdrawals.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No withdrawals yet</p>
        )}
      </div>

      {/* ── Desktop table (hidden on mobile) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)]">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Amount</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Chain</th>
              <th className="hidden pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] md:table-cell">Recipient</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</th>
              <th className="hidden pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && withdrawals.length === 0
              ? skeletonRows.map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-dark)]">
                    <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 pr-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="hidden py-3 pr-4 md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 pr-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="hidden py-3 lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              : withdrawals.map((w) => (
                  <tr key={w.public_id} className="border-b border-[var(--border-dark)] last:border-0 hover:bg-[hsl(var(--bg-hover))] transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatAmount(w.actual_amount ?? w.estimated_amount)}
                      </span>
                      <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">USDC</span>
                    </td>
                    <td className="py-3.5 pr-4 text-sm capitalize text-[var(--text-secondary)]">{w.destination_chain}</td>
                    <td className="hidden py-3.5 pr-4 font-mono text-xs text-[var(--text-secondary)] md:table-cell">
                      {truncateAddress(w.recipient_address)}
                    </td>
                    <td className="py-3.5 pr-4">
                      <Badge variant={statusVariant(w.status)}>{friendlyStatus(w.status)}</Badge>
                    </td>
                    <td className="hidden py-3.5 text-sm text-[var(--text-secondary)] lg:table-cell">{formatDate(w.created_at)}</td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && withdrawals.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No withdrawals yet</p>
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
