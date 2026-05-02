import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTransactionStore } from '@/stores/transaction-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { useAuthStore } from '@/stores/auth-store';
import { useBalance } from '@/hooks/use-balance';
import { useContractRead } from '@/hooks/use-contract-read';
import { useAdminFlow, strToBytes2, strToBytes4, parseUint32Array } from '@/hooks/use-admin-flow';
import { TransactionList } from '@/components/features/transaction-list';
import { WithdrawalList } from '@/components/features/withdrawal-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isClaimEligible } from '@/hooks/use-claim-eligibility';
import { ADDRESSES } from '@/lib/contracts';

const ARBISCAN = 'https://sepolia.arbiscan.io/address';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDays(seconds: bigint | null) {
  if (seconds === null) return '—';
  return `${Number(seconds) / 86400} days`;
}

function shortAddr(addr: string | null) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Stat card ────────────────────────────────────────────────────────────────
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
    blue:   'bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]',
    green:  'bg-[hsl(var(--tip-bg))] text-[var(--status-success)]',
    amber:  'bg-[hsl(var(--warning-bg))] text-[var(--status-warning)]',
    purple: 'bg-[hsl(var(--brand-purple-light))] text-[hsl(var(--brand-purple))]',
  }[accent];

  const valueColor = {
    blue:   'text-[var(--text-primary)]',
    green:  'text-[var(--status-success)]',
    amber:  'text-[var(--status-warning)]',
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

// ── Empty state ──────────────────────────────────────────────────────────────
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

// ── Address row ──────────────────────────────────────────────────────────────
function AddrRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-dark)] py-3 last:border-0">
      <p className="min-w-[180px] shrink-0 text-xs text-[var(--text-muted)]">{label}</p>
      <a
        href={`${ARBISCAN}/${address}`}
        target="_blank"
        rel="noreferrer"
        className="break-all font-mono text-xs text-[var(--accent-blue)] hover:underline"
      >
        {address}
      </a>
    </div>
  );
}

// ── State row ────────────────────────────────────────────────────────────────
function StateRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-dark)] py-2.5 last:border-0">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`font-mono text-xs ${ok === undefined ? 'text-[var(--text-primary)]' : ok ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Contract state panel ─────────────────────────────────────────────────────
function ContractStatusPanel() {
  const { state, loading, error, fetchAll } = useContractRead();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-[var(--border-dark)] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Contract State</h2>
          <p className="text-xs text-[var(--text-muted)]">Live on-chain values — Arbitrum Sepolia</p>
        </div>
        <Button size="sm" variant="secondary" loading={loading} onClick={fetchAll}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="border-b border-[var(--border-dark)] px-5 py-3">
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        </div>
      )}

      <div className="grid gap-0 sm:grid-cols-2">
        {/* TradeInvoiceResolver state */}
        <div className="border-b border-r border-[var(--border-dark)] px-5 py-4 sm:border-b-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">TradeInvoiceResolver</p>
          {loading && !state.escrowContract ? (
            <div className="flex flex-col gap-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : (
            <>
              <StateRow label="escrowContract"   value={shortAddr(state.escrowContract)} />
              <StateRow label="MIN_WAITING_PERIOD" value={fmtDays(state.minWaitingPeriod)} />
              <StateRow label="MAX_WAITING_PERIOD" value={fmtDays(state.maxWaitingPeriod)} />
              <StateRow label="owner"            value={shortAddr(state.resolverOwner)} />
            </>
          )}
        </div>

        {/* TradeCreditInsurancePolicy state */}
        <div className="px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">TradeCreditInsurancePolicy</p>
          {loading && state.curveVersion === null ? (
            <div className="flex flex-col gap-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : (
            <>
              <StateRow label="curveVersion"     value={state.curveVersion !== null ? String(state.curveVersion) : '—'} />
              <StateRow label="protocolCaller"   value={shortAddr(state.protocolCaller)} />
              <StateRow label="debtorProofAdapter" value={shortAddr(state.debtorProofAdapter)} />
              <StateRow label="exposureRegistry" value={shortAddr(state.exposureRegistry)} />
              <StateRow label="lossHistory"      value={shortAddr(state.lossHistory)} />
              <StateRow label="owner"            value={shortAddr(state.policyOwner)} />
            </>
          )}
        </div>
      </div>

      {/* Registry wiring */}
      <div className="border-t border-[var(--border-dark)] px-5 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Registry Wiring</p>
        {loading && state.policyInExposureRegistry === null ? (
          <Skeleton className="h-4 w-1/2" />
        ) : (
          <div className="grid gap-0 sm:grid-cols-2">
            <StateRow
              label="Policy in ExposureRegistry"
              value={state.policyInExposureRegistry === null ? '—' : state.policyInExposureRegistry ? 'registered ✓' : 'not registered ✗'}
              ok={state.policyInExposureRegistry ?? undefined}
            />
            <StateRow
              label="Policy in ClaimsRegistry"
              value={state.policyInClaimsRegistry === null ? '—' : state.policyInClaimsRegistry ? 'registered ✓' : 'not registered ✗'}
              ok={state.policyInClaimsRegistry ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contract addresses panel ─────────────────────────────────────────────────
function ContractAddressesPanel() {
  return (
    <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border-dark)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Contract Addresses</h2>
        <p className="text-xs text-[var(--text-muted)]">All deployed contracts — chain ID 421614</p>
      </div>
      <div className="px-5 py-2">
        <p className="mb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">PROVA Plugins</p>
        <AddrRow label="TradeInvoiceResolver"       address={ADDRESSES.TradeInvoiceResolver} />
        <AddrRow label="TradeCreditInsurancePolicy" address={ADDRESSES.TradeCreditInsurancePolicy} />
        <AddrRow label="DebtorExposureRegistry"     address={ADDRESSES.DebtorExposureRegistry} />
        <AddrRow label="InsuranceClaimsRegistry"    address={ADDRESSES.InsuranceClaimsRegistry} />
        <AddrRow label="MockDebtorProof"            address={ADDRESSES.MockDebtorProof} />
        <p className="mb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reineira Core</p>
        <AddrRow label="ConfidentialEscrow"         address={ADDRESSES.ConfidentialEscrow} />
        <AddrRow label="ConfidentialCoverageManager" address={ADDRESSES.ConfidentialCoverageManager} />
        <AddrRow label="PoolFactory"                address={ADDRESSES.PoolFactory} />
        <AddrRow label="PolicyRegistry"             address={ADDRESSES.PolicyRegistry} />
        <AddrRow label="cUSDC"                      address={ADDRESSES.cUSDC} />
        <AddrRow label="USDC"                       address={ADDRESSES.USDC} />
      </div>
    </div>
  );
}

// ── Admin form helpers ────────────────────────────────────────────────────────
function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--border-dark)] px-5 py-5 last:border-0">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

function AdminForm({
  label,
  fields,
  disabled,
  onSubmit,
}: {
  label: string;
  fields: { id: string; placeholder: string; value: string; onChange: (v: string) => void }[];
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-subtle)] border border-[var(--border-dark)] p-4">
      <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {fields.map((f) => (
          <Input
            key={f.id}
            placeholder={f.placeholder}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 font-mono text-xs"
          />
        ))}
        <Button size="sm" disabled={disabled} onClick={onSubmit} className="shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}

// ── Admin panel ───────────────────────────────────────────────────────────────
function AdminPanel() {
  const admin = useAdminFlow();

  // form state
  const [escrowContractAddr, setEscrowContractAddr] = useState('');

  const [capDebtorId, setCapDebtorId]   = useState('');
  const [capValue, setCapValue]         = useState('');

  const [countryCode, setCountryCode]   = useState('');
  const [countryBps, setCountryBps]     = useState('');

  const [industryCode, setIndustryCode] = useState('');
  const [industryBps, setIndustryBps]   = useState('');

  const [curveThresholds, setCurveThresholds] = useState('800,720,650,580,500,0');
  const [curvePremiums, setCurvePremiums]     = useState('150,200,280,400,600,1000');

  const [newProtocolCaller, setNewProtocolCaller] = useState('');

  const [regContractAddr, setRegContractAddr]     = useState('');
  const [deregContractAddr, setDeregContractAddr] = useState('');

  const [regPolicyAddr, setRegPolicyAddr] = useState('');

  const [scoreDebtorId, setScoreDebtorId] = useState('');
  const [scoreCtHash, setScoreCtHash]     = useState('');
  const [defaultCtHash, setDefaultCtHash] = useState('');

  async function submit(fn: () => Promise<unknown>, label: string) {
    try { await fn(); }
    catch (e) { console.error(`${label} failed:`, e); }
  }

  return (
    <div className="rounded-[var(--radius-block)] border border-[hsl(var(--warning-border,35_100%_80%))] bg-white shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border-dark)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--status-warning)]">Admin Panel</h2>
        <p className="text-xs text-[var(--text-muted)]">Owner-only contract calls — Arbitrum Sepolia</p>
      </div>

      {admin.error && (
        <div className="border-b border-[var(--border-dark)] px-5 py-3">
          <p className="text-xs text-[var(--status-error)]">{admin.error}</p>
        </div>
      )}

      {admin.txHash && (
        <div className="border-b border-[var(--border-dark)] px-5 py-3">
          <p className="text-xs text-[var(--status-success)]">
            Sent:{' '}
            <a href={`https://sepolia.arbiscan.io/tx/${admin.txHash}`} target="_blank" rel="noreferrer"
              className="font-mono underline">
              {admin.txHash.slice(0, 18)}…
            </a>
          </p>
        </div>
      )}

      {/* TradeInvoiceResolver */}
      <AdminSection title="TradeInvoiceResolver">
        <AdminForm
          label="setEscrowContract(address _escrowContract)"
          disabled={admin.loading}
          fields={[{ id: 'esc', placeholder: '0x… ConfidentialEscrow address', value: escrowContractAddr, onChange: setEscrowContractAddr }]}
          onSubmit={() => submit(() => admin.setEscrowContract(escrowContractAddr), 'setEscrowContract')}
        />
      </AdminSection>

      {/* TradeCreditInsurancePolicy */}
      <AdminSection title="TradeCreditInsurancePolicy">
        <AdminForm
          label="setConcentrationCap(bytes32 debtorId, uint64 cap)"
          disabled={admin.loading}
          fields={[
            { id: 'cdid', placeholder: '0x… debtorId (bytes32)', value: capDebtorId, onChange: setCapDebtorId },
            { id: 'cap',  placeholder: 'cap (uint64, e.g. 500000)', value: capValue, onChange: setCapValue },
          ]}
          onSubmit={() =>
            submit(
              () => admin.setConcentrationCap(capDebtorId as `0x${string}`, BigInt(capValue)),
              'setConcentrationCap',
            )
          }
        />
        <AdminForm
          label="setCountryRisk(bytes2 countryCode, uint16 bps)  — e.g. NG, 300"
          disabled={admin.loading}
          fields={[
            { id: 'cc',  placeholder: 'ISO code e.g. NG', value: countryCode, onChange: setCountryCode },
            { id: 'cbps', placeholder: 'bps 0–500',       value: countryBps,  onChange: setCountryBps },
          ]}
          onSubmit={() =>
            submit(
              () => admin.setCountryRisk(strToBytes2(countryCode), parseInt(countryBps, 10)),
              'setCountryRisk',
            )
          }
        />
        <AdminForm
          label="setIndustryRisk(bytes4 industryCode, uint16 bps)  — e.g. 6419, 200"
          disabled={admin.loading}
          fields={[
            { id: 'ic',  placeholder: 'NACE/SIC e.g. 6419', value: industryCode, onChange: setIndustryCode },
            { id: 'ibps', placeholder: 'bps 0–500',          value: industryBps,  onChange: setIndustryBps },
          ]}
          onSubmit={() =>
            submit(
              () => admin.setIndustryRisk(strToBytes4(industryCode), parseInt(industryBps, 10)),
              'setIndustryRisk',
            )
          }
        />
        <AdminForm
          label="setCurve(uint32[6] thresholds, uint32[6] premiums)  — 6 comma-separated values each"
          disabled={admin.loading}
          fields={[
            { id: 'thr', placeholder: 'thresholds e.g. 800,720,650,580,500,0',   value: curveThresholds, onChange: setCurveThresholds },
            { id: 'prm', placeholder: 'premiums bps e.g. 150,200,280,400,600,1000', value: curvePremiums,   onChange: setCurvePremiums },
          ]}
          onSubmit={() =>
            submit(
              () => admin.setCurve(parseUint32Array(curveThresholds, 6), parseUint32Array(curvePremiums, 6)),
              'setCurve',
            )
          }
        />
        <AdminForm
          label="setProtocolCaller(address caller)"
          disabled={admin.loading}
          fields={[{ id: 'pc', placeholder: '0x… ConfidentialCoverageManager', value: newProtocolCaller, onChange: setNewProtocolCaller }]}
          onSubmit={() => submit(() => admin.setProtocolCaller(newProtocolCaller), 'setProtocolCaller')}
        />
      </AdminSection>

      {/* DebtorExposureRegistry */}
      <AdminSection title="DebtorExposureRegistry">
        <AdminForm
          label="registerContract(address prova)"
          disabled={admin.loading}
          fields={[{ id: 'rc', placeholder: '0x… contract to whitelist', value: regContractAddr, onChange: setRegContractAddr }]}
          onSubmit={() => submit(() => admin.registerContract(regContractAddr), 'registerContract')}
        />
        <AdminForm
          label="deregisterContract(address prova)"
          disabled={admin.loading}
          fields={[{ id: 'dc', placeholder: '0x… contract to remove', value: deregContractAddr, onChange: setDeregContractAddr }]}
          onSubmit={() => submit(() => admin.deregisterContract(deregContractAddr), 'deregisterContract')}
        />
      </AdminSection>

      {/* InsuranceClaimsRegistry */}
      <AdminSection title="InsuranceClaimsRegistry">
        <AdminForm
          label="registerPolicy(address policy)"
          disabled={admin.loading}
          fields={[{ id: 'rp', placeholder: '0x… policy contract', value: regPolicyAddr, onChange: setRegPolicyAddr }]}
          onSubmit={() => submit(() => admin.registerPolicy(regPolicyAddr), 'registerPolicy')}
        />
      </AdminSection>

      {/* MockDebtorProof (testnet) */}
      <AdminSection title="MockDebtorProof  (testnet only)">
        <AdminForm
          label="setScore(bytes32 debtorId, uint256 ctHash)"
          disabled={admin.loading}
          fields={[
            { id: 'sdid', placeholder: '0x… debtorId (bytes32)', value: scoreDebtorId, onChange: setScoreDebtorId },
            { id: 'sct',  placeholder: 'ctHash (uint256 decimal)', value: scoreCtHash,  onChange: setScoreCtHash },
          ]}
          onSubmit={() =>
            submit(
              () => admin.setScore(scoreDebtorId as `0x${string}`, BigInt(scoreCtHash)),
              'setScore',
            )
          }
        />
        <AdminForm
          label="setDefaultScore(uint256 ctHash)"
          disabled={admin.loading}
          fields={[{ id: 'dct', placeholder: 'ctHash (uint256 decimal)', value: defaultCtHash, onChange: setDefaultCtHash }]}
          onSubmit={() => submit(() => admin.setDefaultScore(BigInt(defaultCtHash)), 'setDefaultScore')}
        />
      </AdminSection>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate       = useNavigate();
  const role           = useAuthStore((s) => s.role);
  const transactions   = useTransactionStore((s) => s.transactions);
  const transactionLoading = useTransactionStore((s) => s.loading);
  const fetchTransactions  = useTransactionStore((s) => s.fetchTransactions);
  const withdrawals    = useWithdrawalStore((s) => s.withdrawals);
  const withdrawalLoading  = useWithdrawalStore((s) => s.loading);
  const fetchWithdrawals   = useWithdrawalStore((s) => s.fetchWithdrawals);
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

  const activeEscrows = transactions.filter((t) =>
    ['PENDING', 'ON_CHAIN', 'PROCESSING'].includes(t.status),
  ).length;
  const settledEscrows = transactions.filter((t) =>
    ['SETTLED', 'REDEEMED'].includes(t.status),
  ).length;
  const activeWithdrawals = withdrawals.filter((w) =>
    ['PENDING_REDEEM', 'PENDING_BRIDGE', 'BRIDGING'].includes(w.status),
  ).length;
  const claimsReady = transactions.filter(isClaimEligible).length;

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
        <StatCard
          label="Claims Ready"
          value={transactionLoading && transactions.length === 0 ? '—' : claimsReady}
          sub="Waiting period passed"
          loading={transactionLoading && transactions.length === 0}
          accent="amber"
          icon={
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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

      {/* Contract state + addresses */}
      <ContractStatusPanel />
      <ContractAddressesPanel />

      {/* Admin panel — ADMIN role only */}
      {role === 'ADMIN' && <AdminPanel />}
    </div>
  );
}
