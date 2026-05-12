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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function TransactionList({ transactions, loading, hasMore, onLoadMore, onSelect }: TransactionListProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-dark)]">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reference</th>
              <th className="hidden pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:table-cell">Counterparty</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Amount</th>
              <th className="hidden pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] md:table-cell">Due Date</th>
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</th>
              <th className="hidden pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.public_id}
                className="border-b border-[var(--border-dark)] last:border-0 cursor-pointer hover:bg-[hsl(var(--bg-hover))] transition-colors"
                onClick={() => onSelect?.(transaction)}
              >
                <td className="py-3 pr-4 text-sm font-medium text-[var(--text-primary)]">
                  {transaction.external_reference || '—'}
                </td>
                <td className="hidden py-3 pr-4 text-sm text-[var(--text-secondary)] sm:table-cell">
                  <span className="font-mono text-xs">{`${transaction.counterparty.slice(0, 6)}...${transaction.counterparty.slice(-4)}`}</span>
                </td>
                <td className="py-3 pr-4 text-sm font-semibold text-[var(--text-primary)]">
                  {formatAmount(transaction.amount)} <span className="text-xs font-normal text-[var(--text-muted)]">USDC</span>
                </td>
                <td className="hidden py-3 pr-4 text-sm text-[var(--text-secondary)] md:table-cell">{formatDate(transaction.deadline)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
                    {isClaimEligible(transaction) && (
                      <Badge variant="warning">Claim Ready</Badge>
                    )}
                  </div>
                </td>
                <td className="hidden py-3 text-sm text-[var(--text-secondary)] lg:table-cell">{formatDate(transaction.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && transactions.length === 0 && (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No transactions yet</p>
      )}

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
