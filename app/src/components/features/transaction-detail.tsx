import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { TransactionResponse } from '@/services/TransactionService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { isClaimEligible, claimOpenAt } from '@/hooks/use-claim-eligibility';
import { useCoverageFlow, COVERAGE_FLOW_STEPS } from '@/hooks/use-pool-flow';
import { useFundFlow, FUND_FLOW_STEPS } from '@/hooks/use-fund-flow';
import { useTransactionStore } from '@/stores/transaction-store';
import { useAuthStore } from '@/stores/auth-store';

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
  const fetchTransaction = useTransactionStore((s) => s.fetchTransaction);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const isBuyer = !!walletAddress && !!transaction.counterparty &&
    walletAddress.toLowerCase() === transaction.counterparty.toLowerCase();
  const isSeller = !isBuyer;

  const eligible = isClaimEligible(transaction);
  const openAt = transaction.on_chain_id ? claimOpenAt(transaction.deadline) : null;
  const claimPending = !eligible && openAt !== null && openAt > Date.now();
  // Buyer paid and waiting period passed → seller can redeem
  const canRedeem = isSeller && eligible && transaction.status === 'FUNDED';
  // Buyer never paid and waiting period passed → seller can only claim insurance (if covered)
  const buyerDefaulted = isSeller && eligible && transaction.status === 'ON_CHAIN';

  const coverageFlow = useCoverageFlow();
  const [showCoverageFlow, setShowCoverageFlow] = useState(false);

  const fundFlow = useFundFlow();
  const [showFundFlow, setShowFundFlow] = useState(false);

  const canBuyCoverage = isSeller && !!transaction.on_chain_id && !transaction.coverage_id && transaction.status === 'ON_CHAIN';
  const hasCoverage = !!transaction.coverage_id;
  const canPay = isBuyer && transaction.status === 'ON_CHAIN' && !!transaction.on_chain_id;

  async function handleBuyCoverage() {
    setShowCoverageFlow(true);
    coverageFlow.reset();
    const success = await coverageFlow.execute(transaction.public_id);
    if (success) {
      await fetchTransaction(transaction.public_id);
    }
  }

  async function handlePay() {
    setShowFundFlow(true);
    fundFlow.reset();
    await fundFlow.execute(transaction.on_chain_id!, transaction.amount, transaction.public_id);
  }

  return (
    <Card>
      <div className="flex flex-col gap-6">
        {/* Buyer paid — seller can redeem */}
        {canRedeem && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--status-success)] bg-[hsl(var(--tip-bg))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--status-success)]">Ready to redeem</p>
              <p className="text-xs text-[var(--text-secondary)]">The buyer has paid and the waiting period has passed. Go to Withdrawals to collect your funds.</p>
            </div>
            <Button size="sm" onClick={() => navigate({ to: '/withdrawals' })}>
              Redeem Now
            </Button>
          </div>
        )}

        {/* Buyer defaulted — seller can only claim insurance */}
        {buyerDefaulted && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--status-warning)] bg-[hsl(var(--warning-bg))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--status-warning)]">Buyer has not paid</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {hasCoverage
                  ? 'The waiting period has passed and no payment was received. You can file an insurance claim.'
                  : 'The waiting period has passed and no payment was received. No coverage was purchased — funds cannot be recovered.'}
              </p>
            </div>
            {hasCoverage && (
              <Button size="sm" variant="secondary" onClick={() => navigate({ to: '/withdrawals' })}>
                File Claim
              </Button>
            )}
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
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
            {hasCoverage && <Badge variant="success">Insured</Badge>}
          </div>
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

        {/* Buy Coverage section */}
        {canBuyCoverage && !showCoverageFlow && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Insurance coverage</p>
              <p className="text-xs text-[var(--text-muted)]">Protect this transaction against buyer default.</p>
            </div>
            <Button size="sm" onClick={handleBuyCoverage}>Buy Coverage</Button>
          </div>
        )}

        {showCoverageFlow && (
          <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Purchasing coverage</p>
            <TransactionProgress steps={COVERAGE_FLOW_STEPS} currentStep={coverageFlow.currentStep} />
            {coverageFlow.inProgress && !coverageFlow.error && (
              <div className="flex items-center gap-2 rounded-[var(--radius-subtle)] bg-[var(--accent-blue-bg)] px-4 py-3">
                <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-[var(--accent-blue)]">Processing on-chain… please wait</p>
              </div>
            )}
            {coverageFlow.error && (
              <div className="flex flex-col gap-3">
                <div className="rounded-[var(--radius-subtle)] border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
                  <p className="text-sm text-[var(--status-error)]">{coverageFlow.error}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { coverageFlow.reset(); setShowCoverageFlow(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleBuyCoverage}>Try Again</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pay Invoice section — visible when escrow is on-chain and not yet funded */}
        {canPay && !showFundFlow && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Pay invoice</p>
              <p className="text-xs text-[var(--text-muted)]">
                Send {transaction.amount.toFixed(2)} USDC to fund this escrow.
              </p>
            </div>
            <Button size="sm" onClick={handlePay}>Pay Now</Button>
          </div>
        )}

        {showFundFlow && (
          <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Paying invoice</p>
            <TransactionProgress steps={FUND_FLOW_STEPS} currentStep={fundFlow.currentStep} />
            {fundFlow.inProgress && !fundFlow.error && (
              <div className="flex items-center gap-2 rounded-[var(--radius-subtle)] bg-[var(--accent-blue-bg)] px-4 py-3">
                <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-[var(--accent-blue)]">Processing on-chain… please wait</p>
              </div>
            )}
            {fundFlow.error && (
              <div className="flex flex-col gap-3">
                <div className="rounded-[var(--radius-subtle)] border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
                  <p className="text-sm text-[var(--status-error)]">{fundFlow.error}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { fundFlow.reset(); setShowFundFlow(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handlePay}>Try Again</Button>
                </div>
              </div>
            )}
            {!fundFlow.inProgress && !fundFlow.error && fundFlow.currentStep === 6 && (
              <p className="text-sm text-[var(--status-success)]">Payment sent successfully.</p>
            )}
          </div>
        )}

        {transaction.tx_hash && (
          <div className="border-t border-[var(--border-dark)] pt-4">
            <p className="text-sm text-[var(--text-secondary)]">Transaction Hash</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">{transaction.tx_hash}</p>
          </div>
        )}

        {transaction.on_chain_id && (
          <div className="border-t border-[var(--border-dark)] pt-4">
            <p className="text-sm text-[var(--text-secondary)]">On-Chain ID</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
              {transaction.on_chain_id}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
