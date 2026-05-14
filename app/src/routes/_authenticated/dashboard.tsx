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
import { useBalance } from '@/hooks/use-balance';
import { useCUsdcBalance } from '@/hooks/use-cUsdc-balance';
import { useContractRead } from '@/hooks/use-contract-read';
import { useAdminFlow, strToBytes2, strToBytes4, parseUint32Array } from '@/hooks/use-admin-flow';
import { useFundFlow, FUND_FLOW_STEPS } from '@/hooks/use-fund-flow';
import { TransactionList } from '@/components/features/transaction-list';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { WithdrawalList } from '@/components/features/withdrawal-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isClaimEligible } from '@/hooks/use-claim-eligibility';
import { ADDRESSES, ConfidentialEscrowABI } from '@/lib/contracts';
import { TransactionService, type TransactionResponse } from '@/services/TransactionService';
import { EscrowService } from '@/services/EscrowService';
import { publicClient } from '@/lib/public-client';
import { MetricBlock } from '@/components/features/metric-block';

const ARBISCAN = 'https://sepolia.arbiscan.io/address';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDays(seconds: bigint | null) {
  if (seconds === null) return '—';
  return `${Math.floor(Number(seconds) / 86400)} days`;
}

function shortAddr(addr: string | null) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ROLE_LABEL: Record<string, string> = {
  SELLER: 'Seller',
  BUYER: 'Buyer',
  LP: 'Liquidity Provider',
  ADMIN: 'Admin',
};

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
    blue:  'bg-[var(--accent-blue-bg)] border-[var(--accent-blue)] text-[var(--accent-blue)]',
    amber: 'bg-[hsl(var(--warning-bg))] border-[hsl(var(--warning-border))] text-[var(--status-warning)]',
    green: 'bg-[hsl(var(--tip-bg))] border-[hsl(var(--tip-border))] text-[var(--status-success)]',
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



// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({
  title,
  subtitle,
  action,
  children,
  noPadding,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[var(--border-dark)] pb-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={noPadding ? '' : ''}>{children}</div>
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-[var(--text-muted)]">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Address row ───────────────────────────────────────────────────────────────
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

// ── State row ─────────────────────────────────────────────────────────────────
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

// ── Developer tools (collapsible) ─────────────────────────────────────────────
export function DevToolsDrawer() {
  const [open, setOpen] = useState(false);
  const { state, loading, error, fetchAll } = useContractRead();

  useEffect(() => { if (open) fetchAll(); }, [open, fetchAll]);

  return (
    <div className="rounded-xl border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[hsl(var(--bg-hover))]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--bg-surface-alt))]">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--text-muted)]">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Developer Tools</p>
            <p className="text-xs text-[var(--text-muted)]">Contract state, addresses — Arbitrum Sepolia</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--border-dark)]">
          {/* Contract state */}
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contract State</p>
              <Button size="sm" variant="secondary" loading={loading} onClick={fetchAll}>Refresh</Button>
            </div>
            {error && <p className="mb-3 text-xs text-[var(--status-error)]">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border-dark)] p-3">
                <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">TradeInvoiceResolver</p>
                {loading ? (
                  <div className="flex flex-col gap-1.5"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                ) : (
                  <>
                    <StateRow label="escrowContract" value={shortAddr(state.escrowContract)} />
                    <StateRow label="MIN_WAITING_PERIOD" value={fmtDays(state.minWaitingPeriod)} />
                    <StateRow label="MAX_WAITING_PERIOD" value={fmtDays(state.maxWaitingPeriod)} />
                    <StateRow label="owner" value={shortAddr(state.resolverOwner)} />
                  </>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border-dark)] p-3">
                <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">TradeCreditInsurancePolicy</p>
                {loading ? (
                  <div className="flex flex-col gap-1.5"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                ) : (
                  <>
                    <StateRow label="curveVersion" value={state.curveVersion !== null ? String(state.curveVersion) : '—'} />
                    <StateRow label="protocolCaller" value={shortAddr(state.protocolCaller)} />
                    <StateRow label="debtorProofAdapter" value={shortAddr(state.debtorProofAdapter)} />
                    <StateRow label="exposureRegistry" value={shortAddr(state.exposureRegistry)} />
                    <StateRow label="lossHistory" value={shortAddr(state.lossHistory)} />
                    <StateRow label="owner" value={shortAddr(state.policyOwner)} />
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--border-dark)] p-3">
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Registry Wiring</p>
              {loading ? <Skeleton className="h-4 w-1/2" /> : (
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

          {/* Contract addresses */}
          <div className="border-t border-[var(--border-dark)] px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contract Addresses</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">PROVA Plugins</p>
                <AddrRow label="TradeInvoiceResolver" address={ADDRESSES.TradeInvoiceResolver} />
                <AddrRow label="TradeCreditInsurancePolicy" address={ADDRESSES.TradeCreditInsurancePolicy} />
                <AddrRow label="DebtorExposureRegistry" address={ADDRESSES.DebtorExposureRegistry} />
                <AddrRow label="InsuranceClaimsRegistry" address={ADDRESSES.InsuranceClaimsRegistry} />
                <AddrRow label="MockDebtorProof" address={ADDRESSES.MockDebtorProof} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Reineira Core</p>
                <AddrRow label="ConfidentialEscrow" address={ADDRESSES.ConfidentialEscrow} />
                <AddrRow label="ConfidentialCoverageManager" address={ADDRESSES.ConfidentialCoverageManager} />
                <AddrRow label="PoolFactory" address={ADDRESSES.PoolFactory} />
                <AddrRow label="PolicyRegistry" address={ADDRESSES.PolicyRegistry} />
                <AddrRow label="cUSDC" address={ADDRESSES.cUSDC} />
                <AddrRow label="USDC" address={ADDRESSES.USDC} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin section helpers ─────────────────────────────────────────────────────
function AdminSectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--border-dark)] px-5 py-5 last:border-0">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
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
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-dark)] p-3.5">
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
        <Button size="sm" disabled={disabled} onClick={onSubmit} className="shrink-0">Send</Button>
      </div>
    </div>
  );
}

// ── Admin panel ───────────────────────────────────────────────────────────────
export function AdminPanel() {
  const admin = useAdminFlow();
  const [open, setOpen] = useState(false);
  const [escrowContractAddr, setEscrowContractAddr] = useState('');
  const [capDebtorId, setCapDebtorId] = useState('');
  const [capValue, setCapValue] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryBps, setCountryBps] = useState('');
  const [industryCode, setIndustryCode] = useState('');
  const [industryBps, setIndustryBps] = useState('');
  const [curveThresholds, setCurveThresholds] = useState('800,720,650,580,500,0');
  const [curvePremiums, setCurvePremiums] = useState('150,200,280,400,600,1000');
  const [newProtocolCaller, setNewProtocolCaller] = useState('');
  const [regContractAddr, setRegContractAddr] = useState('');
  const [deregContractAddr, setDeregContractAddr] = useState('');
  const [regPolicyAddr, setRegPolicyAddr] = useState('');
  const [scoreDebtorId, setScoreDebtorId] = useState('');
  const [scoreCtHash, setScoreCtHash] = useState('');
  const [defaultCtHash, setDefaultCtHash] = useState('');

  return (
    <div className="rounded-xl border border-[hsl(var(--warning-border,35_100%_80%))] bg-white shadow-[var(--shadow-sm)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[hsl(var(--warning-bg))]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--warning-bg))]">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--status-warning)]">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--status-warning)]">Admin Panel</p>
            <p className="text-xs text-[var(--text-muted)]">Owner-only contract calls — Arbitrum Sepolia</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--border-dark)]">
          {admin.error && (
            <div className="border-b border-[var(--border-dark)] px-5 py-3">
              <p className="text-xs text-[var(--status-error)]">{admin.error}</p>
            </div>
          )}
          {admin.txHash && (
            <div className="border-b border-[var(--border-dark)] px-5 py-3">
              <p className="text-xs text-[var(--status-success)]">
                Sent:{' '}
                <a href={`https://sepolia.arbiscan.io/tx/${admin.txHash}`} target="_blank" rel="noreferrer" className="font-mono underline">
                  {admin.txHash.slice(0, 18)}…
                </a>
              </p>
            </div>
          )}

          <AdminSectionBlock title="TradeInvoiceResolver">
            <AdminForm label="setEscrowContract(address _escrowContract)" disabled={admin.loading}
              fields={[{ id: 'esc', placeholder: '0x… ConfidentialEscrow address', value: escrowContractAddr, onChange: setEscrowContractAddr }]}
              onSubmit={() => admin.setEscrowContract(escrowContractAddr)} />
          </AdminSectionBlock>

          <AdminSectionBlock title="TradeCreditInsurancePolicy">
            <AdminForm label="setConcentrationCap(bytes32 debtorId, uint64 cap)" disabled={admin.loading}
              fields={[
                { id: 'cdid', placeholder: '0x… debtorId (bytes32)', value: capDebtorId, onChange: setCapDebtorId },
                { id: 'cap', placeholder: 'cap (uint64)', value: capValue, onChange: setCapValue },
              ]}
              onSubmit={() => admin.setConcentrationCap(capDebtorId as `0x${string}`, BigInt(capValue))} />
            <AdminForm label="setCountryRisk(bytes2 countryCode, uint16 bps)" disabled={admin.loading}
              fields={[
                { id: 'cc', placeholder: 'ISO e.g. NG', value: countryCode, onChange: setCountryCode },
                { id: 'cbps', placeholder: 'bps 0–500', value: countryBps, onChange: setCountryBps },
              ]}
              onSubmit={() => admin.setCountryRisk(strToBytes2(countryCode), parseInt(countryBps, 10))} />
            <AdminForm label="setIndustryRisk(bytes4 industryCode, uint16 bps)" disabled={admin.loading}
              fields={[
                { id: 'ic', placeholder: 'NACE/SIC e.g. 6419', value: industryCode, onChange: setIndustryCode },
                { id: 'ibps', placeholder: 'bps 0–500', value: industryBps, onChange: setIndustryBps },
              ]}
              onSubmit={() => admin.setIndustryRisk(strToBytes4(industryCode), parseInt(industryBps, 10))} />
            <AdminForm label="setCurve(uint32[6] thresholds, uint32[6] premiums)" disabled={admin.loading}
              fields={[
                { id: 'thr', placeholder: '800,720,650,580,500,0', value: curveThresholds, onChange: setCurveThresholds },
                { id: 'prm', placeholder: '150,200,280,400,600,1000', value: curvePremiums, onChange: setCurvePremiums },
              ]}
              onSubmit={() => admin.setCurve(parseUint32Array(curveThresholds, 6), parseUint32Array(curvePremiums, 6))} />
            <AdminForm label="setProtocolCaller(address caller)" disabled={admin.loading}
              fields={[{ id: 'pc', placeholder: '0x… ConfidentialCoverageManager', value: newProtocolCaller, onChange: setNewProtocolCaller }]}
              onSubmit={() => admin.setProtocolCaller(newProtocolCaller)} />
          </AdminSectionBlock>

          <AdminSectionBlock title="DebtorExposureRegistry">
            <AdminForm label="registerContract(address prova)" disabled={admin.loading}
              fields={[{ id: 'rc', placeholder: '0x… contract to whitelist', value: regContractAddr, onChange: setRegContractAddr }]}
              onSubmit={() => admin.registerContract(regContractAddr)} />
            <AdminForm label="deregisterContract(address prova)" disabled={admin.loading}
              fields={[{ id: 'dc', placeholder: '0x… contract to remove', value: deregContractAddr, onChange: setDeregContractAddr }]}
              onSubmit={() => admin.deregisterContract(deregContractAddr)} />
          </AdminSectionBlock>

          <AdminSectionBlock title="InsuranceClaimsRegistry">
            <AdminForm label="registerPolicy(address policy)" disabled={admin.loading}
              fields={[{ id: 'rp', placeholder: '0x… policy contract', value: regPolicyAddr, onChange: setRegPolicyAddr }]}
              onSubmit={() => admin.registerPolicy(regPolicyAddr)} />
          </AdminSectionBlock>

          <AdminSectionBlock title="MockDebtorProof (testnet only)">
            <AdminForm label="setScore(bytes32 debtorId, uint256 ctHash)" disabled={admin.loading}
              fields={[
                { id: 'sdid', placeholder: '0x… debtorId (bytes32)', value: scoreDebtorId, onChange: setScoreDebtorId },
                { id: 'sct', placeholder: 'ctHash (uint256 decimal)', value: scoreCtHash, onChange: setScoreCtHash },
              ]}
              onSubmit={() => admin.setScore(scoreDebtorId as `0x${string}`, BigInt(scoreCtHash))} />
            <AdminForm label="setDefaultScore(uint256 ctHash)" disabled={admin.loading}
              fields={[{ id: 'dct', placeholder: 'ctHash (uint256 decimal)', value: defaultCtHash, onChange: setDefaultCtHash }]}
              onSubmit={() => admin.setDefaultScore(BigInt(defaultCtHash))} />
          </AdminSectionBlock>
        </div>
      )}
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
    <div className="border-b border-[var(--border-dark)] py-4 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{refLabel}</p>
            <span className="rounded-full bg-[var(--accent-blue-bg)] px-2 py-0.5 text-xs font-medium text-[var(--accent-blue)]">
              {invoice.amount.toFixed(2)} USDC
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Due {dueDate} · from {invoice.counterparty?.slice(0, 10)}…
          </p>
        </div>
        {!active && (
          <Button size="sm" onClick={handlePay} className="shrink-0">Pay Now</Button>
        )}
      </div>

      {active && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--border-dark)] bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
          <TransactionProgress steps={FUND_FLOW_STEPS} currentStep={fundFlow.currentStep} />
          {fundFlow.inProgress && !fundFlow.error && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-[var(--accent-blue)]">Processing on-chain…</p>
            </div>
          )}
          {fundFlow.error && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--status-error)]">{fundFlow.error}</p>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => { fundFlow.reset(); setActive(false); }}>Cancel</Button>
                <Button size="sm" onClick={handlePay}>Retry</Button>
              </div>
            </div>
          )}
          {!fundFlow.inProgress && !fundFlow.error && fundFlow.currentStep === 6 && (
            <p className="text-xs font-medium text-[var(--status-success)]">Payment sent successfully.</p>
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
      title="Invoices to Pay"
      subtitle="Escrows awaiting your payment"
      action={
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          invoices.length > 0
            ? 'bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]'
            : 'bg-[hsl(var(--bg-surface-alt))] text-[var(--text-muted)]'
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
          desc="When a seller creates an escrow addressed to your wallet, it will appear here for payment."
        />
      ) : (
        invoices.map((inv) => (
          <PayInvoiceRow key={inv.public_id} invoice={inv} onPaid={load} />
        ))
      )}
    </SectionCard>
  );
}

// ── LP stakes list ────────────────────────────────────────────────────────────
function LpStakeRow({ stake }: { stake: { public_id: string; amount: number; created_at: string; on_chain_stake_id?: string; pool_address: string } }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-dark)] py-3.5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue-bg)]">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-[var(--accent-blue)]">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{stake.amount.toFixed(2)} USDC</p>
          <p className="text-xs text-[var(--text-muted)]">
            Staked {new Date(stake.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {stake.on_chain_stake_id && (
          <p className="hidden font-mono text-xs text-[var(--text-muted)] sm:block">ID #{stake.on_chain_stake_id}</p>
        )}
        <span className="rounded-full bg-[hsl(var(--tip-bg))] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">Active</span>
      </div>
    </div>
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
  const poolStatus = usePoolStore((s) => s.status);
  const fetchPoolStatus = usePoolStore((s) => s.fetchStatus);

  const { balance, loading: balanceLoading, startPolling, stopPolling } = useBalance();
  const {
    balance: cUsdcBalance,
    loading: cUsdcLoading,
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

  const activeEscrows = transactions.filter((t) => ['PENDING', 'ON_CHAIN', 'PROCESSING'].includes(t.status)).length;
  const settledEscrows = transactions.filter((t) => ['FUNDED', 'SETTLED', 'REDEEMED'].includes(t.status)).length;
  const activeWithdrawals = withdrawals.filter((w) => ['PENDING_REDEEM', 'PENDING_BRIDGE', 'BRIDGING'].includes(w.status)).length;
  const claimsReady = transactions.filter(isClaimEligible).length;
  const totalStaked = poolStakes.reduce((s, k) => s + k.amount, 0);

  const greeting = getGreeting();
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {greeting}{role === 'SELLER' ? ', merchant' : role === 'BUYER' ? ', customer' : ''}
        </h1>
        {shortWallet && <p className="mt-1.5 font-mono text-sm text-[var(--text-muted)]">{shortWallet}</p>}
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#f7f9fc] px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[var(--accent-blue-bg)] to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Get started with Prova</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Manage your digital transactions, deposit liquidity, and track your balances in one place.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(role === 'SELLER' || role === 'ADMIN') && (
              <div className="flex flex-col items-start gap-4 rounded-xl border border-[var(--border-dark)] bg-white p-5 shadow-sm">
                <span className="rounded-full bg-[var(--accent-blue-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-blue)]">
                  Payments
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Create Transaction</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Set up a new escrow for a customer.</p>
                </div>
                <Button size="sm" asChild className="mt-2 text-xs">
                  <Link href="/transactions">Start →</Link>
                </Button>
              </div>
            )}
            
            {(role === 'LP' || role === 'ADMIN') && (
              <div className="flex flex-col items-start gap-4 rounded-xl border border-[var(--border-dark)] bg-white p-5 shadow-sm">
                <span className="rounded-full bg-[hsl(var(--brand-purple-light))] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--brand-purple))]">
                  Yield
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Provide Liquidity</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Stake USDC to underwrite policies.</p>
                </div>
                <Button size="sm" variant="secondary" asChild className="mt-2 text-xs">
                  <Link href="/pool">Manage Pool →</Link>
                </Button>
              </div>
            )}

            {(role === 'SELLER' || role === 'BUYER' || role === 'LP' || role === 'ADMIN') && (
              <div className="flex flex-col items-start gap-4 rounded-xl border border-[var(--border-dark)] bg-white p-5 shadow-sm">
                <span className="rounded-full bg-[hsl(var(--tip-bg))] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-success)]">
                  Funds
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Withdraw Funds</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Move USDC back to your native chain.</p>
                </div>
                <Button size="sm" variant="secondary" asChild className="mt-2 text-xs">
                  <Link href="/withdrawals">Withdraw →</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Today / Overview Section ── */}
      <div className="mt-6">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Today</h2>
        <div className="flex flex-col divide-y sm:flex-row sm:divide-y-0 sm:divide-x divide-[var(--border-dark)] border-y border-[var(--border-dark)]">
          <MetricBlock 
            label="Total Balance" 
            value={balance !== null ? `${balance.formatted_balance} ${balance.currency}` : '—'} 
            sub="USDC on Arbitrum Sepolia" 
            loading={balanceLoading} 
          />
          {(role === 'SELLER' || role === 'ADMIN' || role === 'LP') && (
            <MetricBlock 
              label="cUSDC Balance" 
              value={cUsdcBalance !== null ? `${cUsdcBalance.formatted} cUSDC` : '—'} 
              sub="Confidential USDC" 
              loading={cUsdcLoading} 
            />
          )}
          {role === 'LP' ? (
            <MetricBlock 
              label="Active Stakes" 
              value={`$${totalStaked.toFixed(2)}`} 
              loading={false} 
            />
          ) : (
            <MetricBlock 
              label="Active Escrows" 
              value={activeEscrows} 
              loading={transactionLoading} 
            />
          )}
        </div>
      </div>

      {/* ── Alert banners (contextual, high priority) ── */}
      {claimsReady > 0 && (
        <AlertBanner
          variant="amber"
          message={`${claimsReady} escrow${claimsReady > 1 ? 's' : ''} ready to claim — waiting period has passed`}
          action={{ label: 'Review', href: '/transactions' }}
          icon={
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          }
        />
      )}



      {/* ── Buyer: payable invoices (highest priority) ── */}
      {role === 'BUYER' && <PayableInvoicesPanel />}

      {/* ── Seller / admin: activity grid ── */}
      {(role === 'SELLER' || role === 'ADMIN') && (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Recent Transactions"
            subtitle="Latest escrow activity"
            action={
              <Link href="/transactions" className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-70 transition-opacity">
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
                title="No transactions yet"
                desc="Create your first escrow to start insuring trade invoices"
                action={<Button size="sm" asChild><Link href="/transactions">New Transaction</Link></Button>}
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
            subtitle="Bridge and redeem history"
            action={
              <Link href="/withdrawals" className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-70 transition-opacity">
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
                desc="Redeem a settled escrow to withdraw funds to your wallet"
                action={<Button size="sm" variant="secondary" asChild><Link href="/withdrawals">New Withdrawal</Link></Button>}
              />
            ) : (
              <WithdrawalList withdrawals={withdrawals.slice(0, 5)} loading={withdrawalLoading} hasMore={false} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Seller / admin: payable invoices (lower priority than own activity) ── */}
      {(role === 'SELLER' || role === 'ADMIN') && <PayableInvoicesPanel />}

      {/* ── LP: stakes list ── */}
      {role === 'LP' && (
        <SectionCard
          title="My Stakes"
          subtitle="Active positions in the insurance pool"
          action={
            <Link href="/pool" className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-70 transition-opacity">
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
              title="No active stakes"
              desc="Provide liquidity to the insurance pool to start earning premiums from covered trade invoices"
              action={<Button size="sm" asChild><Link href="/pool">Provide Liquidity</Link></Button>}
            />
          ) : (
            <div className="flex flex-col">
              {poolStakes.slice(0, 6).map((stake) => (
                <LpStakeRow key={stake.public_id} stake={stake} />
              ))}
              {poolStakes.length > 6 && (
                <div className="pt-3 text-center">
                  <Link href="/pool" className="text-xs font-medium text-[var(--accent-blue)] hover:opacity-70 transition-opacity">
                    View all {poolStakes.length} stakes →
                  </Link>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
