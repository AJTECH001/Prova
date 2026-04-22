import { useNavigate } from '@tanstack/react-router';
import type { TransactionResponse } from '@/services/TransactionService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isClaimEligible, claimOpenAt } from '@/hooks/use-claim-eligibility';

interface TransactionDetailProps {
  transaction: TransactionResponse;
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    SETTLED: 'success',
    COMPLETED: 'success',
    REDEEMED: 'success',
    PENDING: 'warning',
    PENDING_REDEEM: 'warning',
    PENDING_BRIDGE: 'warning',
    PROCESSING: 'warning',
    BRIDGING: 'warning',
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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const navigate = useNavigate();
  const eligible = isClaimEligible(transaction);
  const openAt = transaction.on_chain_escrow_id ? claimOpenAt(transaction.deadline) : null;
  const claimPending = !eligible && openAt !== null && openAt > Date.now();

  return (
    <Card>
      <div className="flex flex-col gap-6">
        {/* Claim eligibility banner */}
        {eligible && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--status-warning)] bg-[hsl(var(--warning-bg))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--status-warning)]">Claim available</p>
              <p className="text-xs text-[var(--text-secondary)]">The waiting period has passed. You can initiate your claim now.</p>
            </div>
            <Button size="sm" onClick={() => navigate({ to: '/withdrawals' })}>
              Initiate Claim
            </Button>
          </div>
        )}

        {claimPending && openAt && (
          <div className="rounded-lg border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Claim opens on {new Date(openAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Transaction</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatAmount(transaction.amount)} USDC</p>
          </div>
          <Badge variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Counterparty</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">{transaction.counterparty}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">External Reference</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">{transaction.external_reference || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Due Date</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">{formatDate(transaction.deadline)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Created</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">{formatDate(transaction.created_at)}</p>
          </div>
        </div>

        {transaction.tx_hash && (
          <div className="border-t border-[var(--border-dark)] pt-4">
            <p className="text-sm text-[var(--text-secondary)]">Transaction Hash</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">{transaction.tx_hash}</p>
          </div>
        )}

        {transaction.on_chain_escrow_id && (
          <div className="border-t border-[var(--border-dark)] pt-4">
            <p className="text-sm text-[var(--text-secondary)]">On-Chain ID</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
              {transaction.on_chain_escrow_id}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
