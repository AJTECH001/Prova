import { useEffect, useState } from 'react';
import { usePoolStore, type StakeRecord } from '@/stores/pool-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCUsdcBalance } from '@/hooks/use-cUsdc-balance';
import { useStakeFlow, useUnstakeFlow, POOL_FLOW_STEPS } from '@/hooks/use-pool-flow';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricBlock } from '@/components/features/metric-block';

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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Stake form ────────────────────────────────────────────────────────────────
function StakeForm({ onSubmit, disabled }: { onSubmit: (amount: number) => void; disabled: boolean }) {
  const [amount, setAmount] = useState('');

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!isNaN(parsed) && parsed > 0) onSubmit(parsed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Amount (USDC)</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={disabled}
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Your USDC is deposited into the insurance pool and earns a share of premiums from covered payments.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || !amount || parseFloat(amount) <= 0}>
          Deposit Funds
        </Button>
      </div>
    </form>
  );
}

// ── Position row ─────────────────────────────────────────────────────────────
function PositionRow({ stake, onUnstake, unstaking }: { stake: StakeRecord; onUnstake: () => void; unstaking: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-dark)] py-4 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {stake.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
          </p>
          <span className="rounded-full bg-[hsl(var(--tip-bg))] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">Active</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Deposited {new Date(stake.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <Button size="sm" variant="secondary" loading={unstaking} onClick={onUnstake} className="shrink-0 w-full sm:w-auto">
        Withdraw
      </Button>
    </div>
  );
}

// ── Pool page ────────────────────────────────────────────────────────────────
export function PoolPage() {
  const status = usePoolStore((s) => s.status);
  const stakes = usePoolStore((s) => s.stakes);
  const loading = usePoolStore((s) => s.loading);
  const fetchStatus = usePoolStore((s) => s.fetchStatus);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { balance: cUsdcBalance, loading: cUsdcLoading, startPolling: startCUsdcPolling, stopPolling: stopCUsdcPolling } = useCUsdcBalance(walletAddress);

  const stakeFlow = useStakeFlow();
  const unstakeFlow = useUnstakeFlow();

  const [showStakeForm, setShowStakeForm] = useState(false);
  const [unstakingId, setUnstakingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    startCUsdcPolling();
    return () => stopCUsdcPolling();
  }, [fetchStatus, startCUsdcPolling, stopCUsdcPolling]);

  async function handleStake(amount: number) {
    const ok = await stakeFlow.execute(amount);
    if (ok) setShowStakeForm(false);
  }

  async function handleUnstake(publicId: string) {
    setUnstakingId(publicId);
    await unstakeFlow.execute(publicId);
    setUnstakingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">Liquidity Pool</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Deposit USDC and earn yield from insurance premiums</p>
        </div>
        <Button
          size="sm"
          variant={showStakeForm ? 'secondary' : 'primary'}
          className="shrink-0"
          onClick={() => {
            setShowStakeForm((v) => !v);
            if (showStakeForm) stakeFlow.reset();
          }}
        >
          {showStakeForm ? 'Cancel' : 'Deposit'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-dark)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <MetricBlock
            label="Your Pool Balance"
            value={cUsdcBalance ? `${cUsdcBalance.formatted} USDC` : '—'}
            sub={cUsdcLoading && !cUsdcBalance ? 'Loading…' : 'Your deposited funds'}
            loading={cUsdcLoading && !cUsdcBalance}
          />
        </div>
        <div className="rounded-xl border border-[var(--border-dark)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <MetricBlock
            label="Total Pool Liquidity"
            value={status ? `${status.total_staked} USDC` : '—'}
            sub="All active deposits"
            loading={loading && !status}
          />
        </div>
        <div className="rounded-xl border border-[var(--border-dark)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <MetricBlock
            label="Premiums Collected"
            value={status ? `${status.premiums_earned} USDC` : '—'}
            sub="From active policies"
            loading={loading && !status}
          />
        </div>
        <div className="rounded-xl border border-[var(--border-dark)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <MetricBlock
            label="Active Depositors"
            value={status ? String(status.active_stakers) : '—'}
            sub="Liquidity providers"
            loading={loading && !status}
          />
        </div>
      </div>

      {/* Stake form panel */}
      {showStakeForm && (
        <div className="rounded-2xl border border-[var(--border-dark)] bg-[#f8fafc] px-6 py-6 sm:px-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Deposit Funds</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Your USDC earns yield as it underwrites trade insurance policies.</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-[var(--border-dark)]">
            {stakeFlow.currentStep < 0 ? (
              <StakeForm onSubmit={handleStake} disabled={stakeFlow.inProgress} />
            ) : (
              <div className="flex flex-col gap-4">
                <TransactionProgress steps={POOL_FLOW_STEPS} currentStep={stakeFlow.currentStep} />
                {stakeFlow.error && (
                  <div className="rounded-lg border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3 mt-4">
                    <p className="text-sm text-[var(--status-error)]">{stakeFlow.error}</p>
                  </div>
                )}
                {stakeFlow.error && (
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={stakeFlow.reset}>Try Again</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unstake error */}
      {unstakeFlow.error && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
          <p className="text-sm text-[var(--status-error)]">{unstakeFlow.error}</p>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => { setUnstakingId(null); unstakeFlow.reset(); }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Your positions */}
      <div className="flex flex-col">
        <div className="flex items-end justify-between border-b border-[var(--border-dark)] pb-4 mb-2">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Your Positions</h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">Active deposits in this pool</p>
          </div>
        </div>
        <div>
          {stakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">No deposits yet</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Deposit USDC to start earning yield from insurance premiums</p>
              <div className="mt-4">
                <Button size="sm" onClick={() => setShowStakeForm(true)}>
                  Deposit Funds
                </Button>
              </div>
            </div>
          ) : (
            stakes.map((stake) => (
              <PositionRow
                key={stake.public_id}
                stake={stake}
                onUnstake={() => handleUnstake(stake.public_id)}
                unstaking={unstakingId === stake.public_id && unstakeFlow.inProgress}
              />
            ))
          )}
        </div>
      </div>

      {/* Advanced details (collapsed) */}
      {status && (
        <AdvancedDetails>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Pool Address</p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">{status.pool_address}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">Policy Address</p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">{status.policy_address}</p>
          </div>
        </AdvancedDetails>
      )}
    </div>
  );
}
