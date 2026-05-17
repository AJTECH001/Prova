import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// ── Detail row ─────────────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ── Advanced details accordion ─────────────────────────────────────────────────
function AdvancedDetails({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[var(--border-dark)] pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]">
          Advanced Details
        </span>
        <svg
          width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
          className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const router = useRouter();
  const fetchTransaction = useTransactionStore((s) => s.fetchTransaction);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const isBuyer = !!walletAddress && !!transaction.counterparty &&
    walletAddress.toLowerCase() === transaction.counterparty.toLowerCase();
  const isSeller = !isBuyer;

  const eligible = isClaimEligible(transaction);
  const openAt = transaction.on_chain_id && transaction.deadline ? claimOpenAt(transaction.deadline) : null;
  const claimPending = !eligible && openAt !== null && openAt > Date.now();
  const canRedeem = isSeller && eligible && (transaction.status === 'FUNDED' || transaction.status === 'SETTLED');
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
      <div className="flex flex-col gap-5">

        {/* ── Status banners ── */}
        {canRedeem && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--status-success)] bg-[hsl(var(--tip-bg))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--status-success)]">Ready to redeem</p>
              <p className="text-xs text-[var(--text-secondary)]">The buyer has paid and the waiting period has passed. Go to Withdrawals to collect your funds.</p>
            </div>
            <Button size="sm" onClick={() => router.push('/withdrawals')} className="ml-4 shrink-0">
              Redeem Now
            </Button>
          </div>
        )}

        {buyerDefaulted && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--status-warning)] bg-[hsl(var(--warning-bg))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--status-warning)]">Payment not received</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {hasCoverage
                  ? 'The waiting period has passed with no payment. You can file an insurance claim to recover funds.'
                  : 'The waiting period has passed with no payment. No coverage was purchased — funds cannot be recovered.'}
              </p>
            </div>
            {hasCoverage && (
              <Button size="sm" variant="secondary" onClick={() => router.push('/withdrawals')} className="ml-4 shrink-0">
                File Claim
              </Button>
            )}
          </div>
        )}

        {claimPending && openAt && (
          <div className="rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Claim window opens {new Date(openAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* ── Amount + status header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Payment amount</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
              {formatAmount(transaction.amount)}
              <span className="ml-1.5 text-base font-normal text-[var(--text-muted)]">USDC</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={statusVariant(transaction.status)}>{friendlyStatus(transaction.status)}</Badge>
            {hasCoverage && <Badge variant="success">Insured</Badge>}
          </div>
        </div>

        {/* ── Core details grid ── */}
        <div className="grid gap-5 sm:grid-cols-2 rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] p-4">
          <DetailRow label={isBuyer ? 'From account' : 'To account'}>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {transaction.counterparty
                ? `Account ••••${transaction.counterparty.slice(-4).toUpperCase()}`
                : '—'}
            </p>
          </DetailRow>
          <DetailRow label="Reference">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {transaction.external_reference || <span className="text-[var(--text-muted)]">—</span>}
            </p>
          </DetailRow>
          <DetailRow label="Due Date">
            <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(transaction.deadline)}</p>
          </DetailRow>
          <DetailRow label="Created">
            <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(transaction.created_at)}</p>
          </DetailRow>
        </div>

        {/* ── Buy Coverage ── */}
        {canBuyCoverage && !showCoverageFlow && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Add payment protection</p>
              <p className="text-xs text-[var(--text-muted)]">Insure this payment against buyer default.</p>
            </div>
            <Button size="sm" onClick={handleBuyCoverage} className="ml-4 shrink-0">Add Coverage</Button>
          </div>
        )}

        {showCoverageFlow && (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Adding coverage…</p>
            <TransactionProgress steps={COVERAGE_FLOW_STEPS} currentStep={coverageFlow.currentStep} />
            {coverageFlow.inProgress && !coverageFlow.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-blue-bg)] px-4 py-3">
                <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-[var(--accent-blue)]">Processing your coverage…</p>
              </div>
            )}
            {coverageFlow.error && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
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

        {/* ── Pay Invoice ── */}
        {canPay && !showFundFlow && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Pay this invoice</p>
              <p className="text-xs text-[var(--text-muted)]">
                Send {transaction.amount.toFixed(2)} USDC to complete this payment.
              </p>
            </div>
            <Button size="sm" onClick={handlePay} className="ml-4 shrink-0">Pay Now</Button>
          </div>
        )}

        {showFundFlow && (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Sending payment…</p>
            <TransactionProgress steps={FUND_FLOW_STEPS} currentStep={fundFlow.currentStep} />
            {fundFlow.inProgress && !fundFlow.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-blue-bg)] px-4 py-3">
                <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-[var(--accent-blue)]">Processing your payment…</p>
              </div>
            )}
            {fundFlow.error && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
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
              <p className="text-sm font-medium text-[var(--status-success)]">Payment sent successfully.</p>
            )}
          </div>
        )}

        {/* ── Advanced details (collapsed by default) ── */}
        {(transaction.tx_hash || transaction.on_chain_id) && (
          <AdvancedDetails>
            {transaction.on_chain_id && (
              <DetailRow label="Internal Reference">
                <p className="break-all font-mono text-xs text-[var(--text-primary)]">
                  #{transaction.on_chain_id}
                </p>
              </DetailRow>
            )}
            {transaction.tx_hash && (
              <DetailRow label="Blockchain Record">
                <a
                  href={`https://sepolia.arbiscan.io/tx/${transaction.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-xs text-[var(--accent-blue)] hover:underline"
                >
                  {transaction.tx_hash}
                </a>
              </DetailRow>
            )}
          </AdvancedDetails>
        )}
      </div>
    </Card>
  );
}
