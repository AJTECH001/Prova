import { useState } from 'react';

const POOLS = [
  {
    id: 'merchants',
    category: 'For Merchants',
    name: 'Credit Insurance Pool',
    summary: 'Protect receivables against buyer default and political risk.',
    detail: {
      label: 'Trade Credit',
      headline: 'Instant coverage, zero exposure.',
      subtitle: 'Built for exporters and suppliers who cannot afford payment defaults.',
      body: 'Your trade receivables are insured against buyer default and political risk using ZK-verified credit scoring. Coverage is issued on-chain in seconds — no broker, no paperwork, no disclosure of sensitive financial data. Claims settle automatically when conditions are met.',
      bullets: [
        'ZK-credit verification — no PII exposed',
        'Auto-claim settlement on trigger',
        'Coverage active within seconds of issuance',
      ],
    },
  },
  {
    id: 'underwriters',
    category: 'For Underwriters',
    name: 'Risk Underwriting Pool',
    summary: 'Define your risk appetite and earn premium income on every approved policy.',
    detail: {
      label: 'Underwriting',
      headline: 'Set your policy. Earn the spread.',
      subtitle: 'For institutions and risk desks building programmable on-chain books.',
      body: 'Design custom underwriting logic using Prova\'s policy engine. Accept or reject merchant applications based on ZK-credit scores — without ever seeing sensitive business data. Earn premium income on every approved policy and manage exposure across a diversified book.',
      bullets: [
        'Programmable risk logic — fully on-chain',
        'ZK-verified approvals, no merchant PII',
        'Premium income on every active policy',
      ],
    },
  },
  {
    id: 'lps',
    category: 'For Liquidity Providers',
    name: 'Yield Pool',
    summary: 'Deposit stablecoins, earn institutional yields backed by real trade assets.',
    detail: {
      label: 'Liquidity',
      headline: 'Deposit stablecoins. Earn real yield.',
      subtitle: 'Institutional returns without institutional complexity.',
      body: 'Deposit USDC into underwriter tiers and earn fixed yields backed by verified trade finance assets. Automated diversification spreads exposure across multiple active policies. Non-custodial escrow means you retain ownership of your capital at all times.',
      bullets: [
        'Fixed yield rate locked at deposit',
        'Automated diversification across policies',
        'Non-custodial — your keys, your capital',
      ],
    },
  },
];

export function LiveFeedDemo() {
  const [activeId, setActiveId] = useState('merchants');
  const active = POOLS.find((p) => p.id === activeId)!;

  return (
    <section id="demo" className="bg-[hsl(var(--bg-surface-alt))] py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header row */}
        <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              Choose your role
            </p>
            <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
              Three ways in.<br />One protocol.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              Whether you need coverage, want to underwrite risk, or are looking for
              yield — there is a pool built for you.
            </p>
          </div>
          <a
            href="#faq"
            className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-4 shrink-0"
          >
            View all pools
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">

          {/* Left — selectable pool list */}
          <div className="flex flex-col gap-3">
            {POOLS.map((pool) => {
              const isActive = pool.id === activeId;
              return (
                <button
                  key={pool.id}
                  onClick={() => setActiveId(pool.id)}
                  className={`w-full rounded-2xl border p-6 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-[hsl(var(--brand-primary)/0.4)] bg-[hsl(var(--brand-primary)/0.04)] shadow-sm'
                      : 'border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] hover:border-[hsl(var(--border-strong))]'
                  }`}
                >
                  <p className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isActive ? 'text-[hsl(var(--brand-primary))]' : 'text-[hsl(var(--text-muted))]'}`}>
                    {pool.category}
                  </p>
                  <p className="text-lg font-black text-[hsl(var(--text-primary))]">{pool.name}</p>
                  <p className="mt-1.5 text-sm text-[hsl(var(--text-secondary))]">{pool.summary}</p>
                </button>
              );
            })}
          </div>

          {/* Right — detail panel */}
          <div className="rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-10">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--brand-primary))]">
              {active.detail.label}
            </p>
            <h3 className="text-4xl font-black tracking-tight text-[hsl(var(--text-primary))]">
              {active.detail.headline}
            </h3>
            <p className="mt-2 text-base font-semibold text-[hsl(var(--text-secondary))]">
              {active.detail.subtitle}
            </p>
            <p className="mt-6 text-[hsl(var(--text-secondary))] leading-relaxed">
              {active.detail.body}
            </p>

            {/* Bullets */}
            <ul className="mt-8 space-y-3">
              {active.detail.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm font-semibold text-[hsl(var(--text-secondary))]">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--brand-primary))]" />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-10">
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--brand-primary))] px-6 py-2.5 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-md shadow-[hsl(var(--brand-primary)/0.2)] transition-colors hover:bg-[hsl(var(--brand-primary-hover))]"
              >
                Explore pools
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
