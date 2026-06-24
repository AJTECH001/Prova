'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { parseEventLogs } from 'viem';
import { useTransactionStore } from '@/stores/transaction-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { useAuthStore } from '@/stores/auth-store';
import { usePoolStore } from '@/stores/pool-store';
import { useRefreshStore } from '@/stores/refresh-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useBalance } from '@/hooks/use-balance';
import { useCUsdcBalance, type CUsdcBalance } from '@/hooks/use-cUsdc-balance';
import { useUnshieldFlow } from '@/hooks/use-unshield-flow';
import { useFundFlow, FUND_FLOW_STEPS } from '@/hooks/use-fund-flow';
import { TransactionList } from '@/components/features/transaction-list';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { WithdrawalList } from '@/components/features/withdrawal-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { isClaimEligible } from '@/hooks/use-claim-eligibility';
import { ADDRESSES, ConfidentialEscrowABI } from '@/lib/contracts';
import { TransactionService, type TransactionResponse } from '@/services/TransactionService';
import { EscrowService } from '@/services/EscrowService';
import { publicClient } from '@/lib/public-client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ROLE_LABEL: Record<string, string> = {
  SELLER: 'Merchant',
  BUYER: 'Customer',
  LP: 'Liquidity Provider',
};

// Parses a decimal string ("100.50") to raw bigint with `decimals` precision
function parseAmountRaw(input: string, decimals = 6): bigint | null {
  try {
    const cleaned = input.trim().replace(/,/g, '');
    if (!cleaned || cleaned === '.') return null;
    const [whole = '0', frac = ''] = cleaned.split('.');
    const fracTrimmed = frac.slice(0, decimals).padEnd(decimals, '0');
    const total = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(fracTrimmed);
    return total > 0n ? total : null;
  } catch {
    return null;
  }
}

// ── Alert banner ──────────────────────────────────────────────────────────────
function AlertBanner({
  variant,
  icon,
  message,
  action,
}: {
  variant: 'blue' | 'amber' | 'green';
  icon: ReactNode;
  message: string;
  action?: { label: string; href: string };
}) {
  const styles = {
    blue:  'bg-[var(--color-brand-subtle)] border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]',
    amber: 'bg-[hsl(var(--ds-amber-bg))] border-[hsl(var(--ds-amber-border))] text-[var(--color-warning)]',
    green: 'bg-[hsl(var(--ds-green-bg))] border-[hsl(var(--ds-green-border))] text-[var(--color-success)]',
  }[variant];

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${styles}`}>
      <div className="flex items-center gap-2.5">
        <span className="shrink-0">{icon}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 rounded-lg border border-current px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-70"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  loading,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
  accent?: 'blue' | 'green' | 'purple';
}) {
  const accentDot = {
    blue:   'bg-[var(--color-brand-primary)]',
    green:  'bg-[var(--color-success)]',
    purple: 'bg-[hsl(var(--ds-teal-600))]',
  }[accent ?? 'blue'] ?? '';

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
      <div className="flex items-center gap-1.5">
        {accent && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accentDot}`} />}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] sm:text-xs truncate">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-24 sm:h-7 sm:w-28" />
      ) : (
        <p className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl tabular-nums leading-tight break-words">{value}</p>
      )}
      {sub && <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)] sm:text-xs">{sub}</p>}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-[var(--color-text-tertiary)]">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Payable invoice row ───────────────────────────────────────────────────────
function PayInvoiceRow({ invoice, onPaid }: { invoice: TransactionResponse; onPaid: () => void }) {
  const fundFlow = useFundFlow();
  const [active, setActive] = useState(false);

  async function handlePay() {
    setActive(true);
    fundFlow.reset();
    const ok = await fundFlow.execute(invoice.on_chain_id!, invoice.amount, invoice.public_id);
    if (ok) onPaid();
  }

  const refLabel = invoice.external_reference || invoice.public_id.slice(0, 8);
  const dueDate = invoice.deadline
    ? new Date(invoice.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="border-b border-[var(--color-border-default)] py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{refLabel}</p>
            <span className="rounded-full bg-[var(--color-brand-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-primary)]">
              {invoice.amount.toFixed(2)} USDC
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
            Due {dueDate}{invoice.counterparty ? ` · Account ••••${invoice.counterparty.slice(-4).toUpperCase()}` : ''}
          </p>
        </div>
        {!active && (
          <Button size="sm" onClick={handlePay} className="shrink-0 min-h-[36px]">Pay Now</Button>
        )}
      </div>

      {active && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[hsl(var(--ds-surface-section))] px-4 py-3">
          <TransactionProgress steps={FUND_FLOW_STEPS} currentStep={fundFlow.currentStep} />
          {fundFlow.inProgress && !fundFlow.error && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-[var(--color-brand-primary)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-[var(--color-brand-primary)]">Sending your payment…</p>
            </div>
          )}
          {fundFlow.error && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--color-error)]">{fundFlow.error}</p>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => { fundFlow.reset(); setActive(false); }}>Cancel</Button>
                <Button size="sm" onClick={handlePay}>Retry</Button>
              </div>
            </div>
          )}
          {!fundFlow.inProgress && !fundFlow.error && fundFlow.currentStep === 6 && (
            <p className="text-xs font-medium text-[var(--color-success)]">Payment sent successfully.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PayableInvoicesPanel() {
  const role = useAuthStore((s) => s.role);
  const [invoices, setInvoices] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await TransactionService.listPayable();
      setInvoices(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!loading && invoices.length === 0 && role !== 'BUYER') return null;

  return (
    <SectionCard
      title="Pending Invoices"
      subtitle="Awaiting your payment"
      action={
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          invoices.length > 0
            ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)]'
            : 'bg-[hsl(var(--ds-surface-section))] text-[var(--color-text-tertiary)]'
        }`}>
          {loading ? '…' : invoices.length}
        </span>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={
            <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
          title="No pending invoices"
          desc="When you receive a payment request, it will appear here."
        />
      ) : (
        invoices.map((inv) => (
          <PayInvoiceRow key={inv.public_id} invoice={inv} onPaid={load} />
        ))
      )}
    </SectionCard>
  );
}

// ── LP deposit row ────────────────────────────────────────────────────────────
function LpStakeRow({ stake }: { stake: { public_id: string; amount: number; created_at: string; on_chain_stake_id?: string; pool_address: string } }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border-default)] py-3.5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-subtle)]">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--color-brand-primary)]">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{stake.amount.toFixed(2)} USDC</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Deposited {new Date(stake.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[hsl(var(--ds-green-bg))] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">Active</span>
      </div>
    </div>
  );
}

// ── Confidential balance card ─────────────────────────────────────────────────
function ConfidentialBalanceCard({
  balance,
  loading,
  walletAddress,
  onUnshieldClick,
}: {
  balance: CUsdcBalance | null;
  loading: boolean;
  walletAddress: string | null;
  onUnshieldClick: () => void;
}) {
  const walletStoreAddress = useWalletStore((s) => s.address);
  const awaitingWallet = !loading && balance === null && walletAddress && !walletStoreAddress;
  const canUnshield = balance !== null && balance.raw > 0n && walletAddress !== null;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-teal-600))]" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] sm:text-xs truncate">
            Confidential Balance
          </p>
        </div>
        {canUnshield && (
          <button
            onClick={onUnshieldClick}
            className="shrink-0 rounded-lg border border-[var(--color-border-default)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] sm:text-xs"
          >
            Unshield →
          </button>
        )}
      </div>

      {loading && balance === null ? (
        <Skeleton className="mt-2 h-6 w-24 sm:h-7 sm:w-28" />
      ) : (
        <p className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl tabular-nums leading-tight">
          {balance !== null ? `${balance.formatted} USDC` : '—'}
        </p>
      )}

      {awaitingWallet ? (
        <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)] sm:text-xs">Awaiting wallet connection to decrypt</p>
      ) : (
        <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)] sm:text-xs">Privacy-protected cUSDC</p>
      )}
    </div>
  );
}

// ── Unshield dialog ───────────────────────────────────────────────────────────
function UnshieldDialog({
  open,
  onOpenChange,
  balance,
  walletAddress,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: CUsdcBalance;
  walletAddress: string;
  onSuccess: () => void;
}) {
  const { state, execute, reset } = useUnshieldFlow();
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const isWorking = state.phase === 'working';
  const isDone = state.phase === 'done';

  function handleInputChange(v: string) {
    setInputValue(v);
    setInputError(null);
    if (!v) return;
    const parsed = parseAmountRaw(v);
    if (!parsed) {
      setInputError('Enter a valid amount');
    } else if (parsed > balance.raw) {
      setInputError('Exceeds available balance');
    }
  }

  function handleMax() {
    setInputValue(balance.formatted);
    setInputError(null);
  }

  async function handleSubmit() {
    const amountRaw = parseAmountRaw(inputValue);
    if (!amountRaw || amountRaw <= 0n || amountRaw > balance.raw) return;
    await execute(walletAddress, amountRaw);
  }

  // Trigger balance refresh as soon as the transaction lands, before user dismisses
  useEffect(() => {
    if (isDone) onSuccess();
  }, [isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (isWorking) return;
    reset();
    setInputValue('');
    setInputError(null);
    onOpenChange(false);
  }

  const amountRaw = parseAmountRaw(inputValue);
  const canSubmit =
    !!amountRaw && amountRaw > 0n && amountRaw <= balance.raw && !inputError && !isWorking && !isDone;

  const dialogTitle = isDone ? 'Unshield Complete' : 'Unshield to Wallet';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        title={dialogTitle}
        onPointerDownOutside={(e) => { if (isWorking) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isWorking) e.preventDefault(); }}
      >
        {isDone ? (
          // ── Success state ──
          <div className="flex flex-col items-center gap-5 pt-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ds-green-bg))]">
              <svg width="26" height="26" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--color-success)]">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)]">USDC is now in your available balance</p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : isWorking ? (
          // ── In-progress state ──
          <div className="flex flex-col gap-5 pt-1">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0 animate-spin text-[var(--color-brand-primary)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{state.statusLabel}</p>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              This may take 30–60 seconds. Please keep this window open.
            </p>
          </div>
        ) : (
          // ── Input state ──
          <div className="flex flex-col gap-5 pt-1">
            <div className="rounded-lg bg-[hsl(var(--ds-surface-section))] px-3 py-2.5">
              <p className="text-xs text-[var(--color-text-tertiary)]">Available</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--color-text-primary)]">
                {balance.formatted}{' '}
                <span className="text-sm font-medium text-[var(--color-text-tertiary)]">cUSDC</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Amount to unshield</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm bg-[var(--color-bg-page)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 ${
                    inputError ? 'border-[var(--color-error)]' : 'border-[var(--color-border-default)]'
                  }`}
                />
                <Button size="sm" variant="secondary" onClick={handleMax} type="button">
                  Max
                </Button>
              </div>
              {inputError && <p className="text-xs text-[var(--color-error)]">{inputError}</p>}
            </div>

            {state.phase === 'error' && state.error && (
              <div className="rounded-lg border border-[var(--color-error)]/20 bg-red-50 px-3 py-2.5">
                <p className="text-xs text-[var(--color-error)]">{state.error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
                Unshield →
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const transactions = useTransactionStore((s) => s.transactions);
  const transactionLoading = useTransactionStore((s) => s.loading);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const withdrawals = useWithdrawalStore((s) => s.withdrawals);
  const withdrawalLoading = useWithdrawalStore((s) => s.loading);
  const fetchWithdrawals = useWithdrawalStore((s) => s.fetchWithdrawals);
  const poolStakes = usePoolStore((s) => s.stakes);
  const fetchPoolStatus = usePoolStore((s) => s.fetchStatus);
  const triggerBalanceRefresh = useRefreshStore((s) => s.triggerBalanceRefresh);

  const [unshieldOpen, setUnshieldOpen] = useState(false);

  const { balance, loading: balanceLoading, fetchBalance: fetchMainBalance, startPolling, stopPolling } = useBalance();
  const {
    balance: cUsdcBalance,
    loading: cUsdcLoading,
    fetchBalance: fetchCUsdcBalance,
    startPolling: startCUsdcPolling,
    stopPolling: stopCUsdcPolling,
  } = useCUsdcBalance(walletAddress);

  useEffect(() => {
    if (role === 'LP') {
      fetchPoolStatus();
    } else {
      fetchTransactions(true);
      fetchWithdrawals(true);
    }
    startPolling();
    startCUsdcPolling();
    return () => { stopPolling(); stopCUsdcPolling(); };
  }, [role, fetchTransactions, fetchWithdrawals, fetchPoolStatus, startPolling, stopPolling, startCUsdcPolling, stopCUsdcPolling]);

  // Auto-reconcile PROCESSING transactions
  useEffect(() => {
    const stuck = transactions.filter((t) => t.status === 'PROCESSING' && t.tx_hash && !t.on_chain_id);
    if (stuck.length === 0) return;
    let changed = false;
    Promise.all(
      stuck.map(async (t) => {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: t.tx_hash as `0x${string}` });
          if (receipt.status === 'reverted') return;
          const events = parseEventLogs({
            abi: ConfidentialEscrowABI,
            logs: receipt.logs.filter((l) => l.address.toLowerCase() === ADDRESSES.ConfidentialEscrow.toLowerCase()),
            eventName: 'EscrowCreated',
          });
          if (events.length === 0) return;
          await EscrowService.reportTransaction(t.tx_hash!, t.public_id, events[0].args.escrowId.toString());
          changed = true;
        } catch { /* non-fatal */ }
      }),
    ).then(() => { if (changed) fetchTransactions(true); });
  }, [transactions, fetchTransactions]);

  // Auto-reconcile ON_CHAIN → FUNDED
  useEffect(() => {
    const onChain = transactions.filter((t) => t.status === 'ON_CHAIN' && t.on_chain_id);
    if (onChain.length === 0) return;
    let changed = false;
    publicClient.getBlockNumber().then(async (latest) => {
      const fromBlock = latest > 100000n ? latest - 100000n : 0n;
      await Promise.all(
        onChain.map(async (t) => {
          try {
            const logs = await publicClient.getLogs({
              address: ADDRESSES.ConfidentialEscrow as `0x${string}`,
              event: { name: 'EscrowFunded', type: 'event', inputs: [{ indexed: true, name: 'escrowId', type: 'uint256' }, { indexed: true, name: 'payer', type: 'address' }] } as const,
              args: { escrowId: BigInt(t.on_chain_id!) },
              fromBlock,
              toBlock: 'latest',
            });
            if (logs.length === 0) return;
            await EscrowService.reportFunded(t.on_chain_id!, logs[0].transactionHash!);
            changed = true;
          } catch { /* non-fatal */ }
        }),
      );
      if (changed) fetchTransactions(true);
    });
  }, [transactions, fetchTransactions]);

  function handleSelectTransaction(transaction: { public_id: string }) {
    router.push('/transactions/' + transaction.public_id);
  }

  function handleUnshieldSuccess() {
    // Refresh both balances from on-chain state after the unshield settles
    triggerBalanceRefresh();
    fetchCUsdcBalance();
    fetchMainBalance();
  }

  const activeEscrows = transactions.filter((t) => ['PENDING', 'ON_CHAIN', 'PROCESSING'].includes(t.status)).length;
  const claimsReady = transactions.filter(isClaimEligible).length;
  const totalStaked = poolStakes.reduce((s, k) => s + k.amount, 0);
  const insuredCount = transactions.filter((t) => !!t.coverage_id).length;

  const greeting = getGreeting();
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
            {greeting}{role === 'SELLER' ? ', merchant' : role === 'BUYER' ? ', customer' : ''}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {shortWallet && (
              <p className="font-mono text-xs text-[var(--color-text-tertiary)]">Account {shortWallet}</p>
            )}
            {role && (
              <span className="rounded-full bg-[hsl(var(--ds-surface-section))] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {role === 'SELLER' && (
            <Button size="sm" asChild className="flex-1 sm:flex-none justify-center min-w-[120px]">
              <Link href="/transactions">+ New Payment</Link>
            </Button>
          )}
          {role === 'LP' && (
            <Button size="sm" variant="secondary" asChild className="flex-1 sm:flex-none justify-center min-w-[120px]">
              <Link href="/pool">Deposit Funds</Link>
            </Button>
          )}
          <Button size="sm" variant="secondary" asChild className="flex-1 sm:flex-none justify-center min-w-[100px]">
            <Link href="/withdrawals">Withdraw</Link>
          </Button>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className={`grid gap-3 sm:gap-4 ${
        role === 'SELLER' ? 'grid-cols-2 lg:grid-cols-4' :
        role === 'LP'     ? 'grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 sm:grid-cols-2'
      }`}>
        <StatCard
          label="Available Balance"
          value={balance !== null ? `${balance.formatted_balance} ${balance.currency}` : '—'}
          sub="Spendable USDC"
          loading={balanceLoading}
          accent="blue"
        />

        {(role === 'SELLER' || role === 'LP') && (
          <ConfidentialBalanceCard
            balance={cUsdcBalance}
            loading={cUsdcLoading}
            walletAddress={walletAddress}
            onUnshieldClick={() => setUnshieldOpen(true)}
          />
        )}

        {role === 'LP' ? (
          <StatCard
            label="Total Deposited"
            value={`$${totalStaked.toFixed(2)}`}
            sub={`${poolStakes.length} active position${poolStakes.length !== 1 ? 's' : ''}`}
            loading={false}
            accent="green"
          />
        ) : (
          <StatCard
            label="Active Payments"
            value={activeEscrows}
            sub="In progress"
            loading={transactionLoading}
            accent="green"
          />
        )}

        {role === 'SELLER' && (
          <StatCard
            label="Insured Invoices"
            value={insuredCount}
            sub="With active coverage"
            loading={transactionLoading}
            accent="purple"
          />
        )}
      </div>

      {/* ── Alert banners ── */}
      {claimsReady > 0 && (
        <AlertBanner
          variant="amber"
          message={`${claimsReady} payment${claimsReady > 1 ? 's are' : ' is'} ready to claim — the waiting period has passed`}
          action={{ label: 'Review', href: '/transactions' }}
          icon={
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          }
        />
      )}

      {/* ── Buyer: payable invoices ── */}
      {role === 'BUYER' && <PayableInvoicesPanel />}

      {/* ── Seller: activity grid ── */}
      {role === 'SELLER' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Recent Activity"
            subtitle="Your most recent payment activity"
            action={
              <Link href="/transactions" className="text-xs font-medium text-[var(--color-brand-primary)] hover:opacity-70 transition-opacity">
                View all →
              </Link>
            }
          >
            {transactions.length === 0 && !transactionLoading ? (
              <EmptyState
                icon={
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                  </svg>
                }
                title="No payments yet"
                desc="Create your first payment to get started"
                action={<Button size="sm" asChild><Link href="/transactions">New Payment</Link></Button>}
              />
            ) : (
              <TransactionList
                transactions={transactions.slice(0, 5)}
                loading={transactionLoading}
                hasMore={false}
                onSelect={handleSelectTransaction}
              />
            )}
          </SectionCard>

          <SectionCard
            title="Recent Withdrawals"
            subtitle="Your withdrawal history"
            action={
              <Link href="/withdrawals" className="text-xs font-medium text-[var(--color-brand-primary)] hover:opacity-70 transition-opacity">
                View all →
              </Link>
            }
          >
            {withdrawals.length === 0 && !withdrawalLoading ? (
              <EmptyState
                icon={
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                }
                title="No withdrawals yet"
                desc="Withdraw funds from completed payments to your wallet"
                action={<Button size="sm" variant="secondary" asChild><Link href="/withdrawals">New Withdrawal</Link></Button>}
              />
            ) : (
              <WithdrawalList withdrawals={withdrawals.slice(0, 5)} loading={withdrawalLoading} hasMore={false} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Seller: payable invoices ── */}
      {role === 'SELLER' && <PayableInvoicesPanel />}

      {/* ── LP: deposits list ── */}
      {role === 'LP' && (
        <SectionCard
          title="My Deposits"
          subtitle="Your funding positions"
          action={
            <Link href="/pool" className="text-xs font-medium text-[var(--color-brand-primary)] hover:opacity-70 transition-opacity">
              Manage →
            </Link>
          }
        >
          {poolStakes.length === 0 ? (
            <EmptyState
              icon={
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              }
              title="No deposits yet"
              desc="Deposit USDC to start earning yield from trade insurance premiums"
              action={<Button size="sm" asChild><Link href="/pool">Deposit Funds</Link></Button>}
            />
          ) : (
            <div className="flex flex-col">
              {poolStakes.slice(0, 6).map((stake) => (
                <LpStakeRow key={stake.public_id} stake={stake} />
              ))}
              {poolStakes.length > 6 && (
                <div className="pt-3 text-center">
                  <Link href="/pool" className="text-xs font-medium text-[var(--color-brand-primary)] hover:opacity-70 transition-opacity">
                    View all {poolStakes.length} deposits →
                  </Link>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Unshield dialog (SELLER + LP) ── */}
      {cUsdcBalance && walletAddress && (
        <UnshieldDialog
          open={unshieldOpen}
          onOpenChange={setUnshieldOpen}
          balance={cUsdcBalance}
          walletAddress={walletAddress}
          onSuccess={handleUnshieldSuccess}
        />
      )}
    </div>
  );
}
