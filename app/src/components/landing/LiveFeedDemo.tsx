import { useState } from 'react';

const POOLS = [
  {
    id: 'merchants',
    category: 'For Sellers',
    name: 'Trade Credit Coverage',
    summary: 'Enter your buyer\'s details. Prova handles the rest.',
    detail: {
      label: 'Coverage',
      headline: 'You sell. We make sure you get paid.',
      subtitle: 'For any business selling goods or services on credit terms.',
      body: 'Create an on-chain escrow for your invoice. Provide your buyer\'s wallet address, invoice amount, and due date — Prova evaluates the buyer\'s payment history and sets your premium automatically. If the buyer pays on time, funds release directly to you. If they don\'t, your coverage triggers and the insurance pool pays you out. No broker, no paperwork, no manual review.',
      bullets: [
        'Buyer\'s payment history evaluated automatically — no broker',
        'Premium set by Prova based on buyer risk, not negotiation',
        'Funds held in escrow until payment conditions are met',
      ],
    },
  },
  {
    id: 'claims',
    category: 'How Claims Work',
    name: 'Claim Settlement',
    summary: 'Buyer didn\'t pay? One transaction. Instant payout.',
    detail: {
      label: 'Claims',
      headline: 'One action. Funds in your wallet.',
      subtitle: 'No adjuster. No forms. No waiting weeks for approval.',
      body: 'When an invoice passes its due date unpaid, a 7-day waiting period begins on-chain. Once that window closes, the payment condition is automatically met. You initiate the claim with a single transaction — the contract verifies the condition and releases your payout directly from the insurance pool. No broker reviews it. No adjuster approves it. The contract does. Traditional trade credit insurance takes weeks. Prova takes one transaction.',
      bullets: [
        '7-day waiting period starts automatically after due date',
        'Seller initiates claim with a single on-chain transaction',
        'Contract verifies and pays out instantly if conditions are met',
      ],
    },
  },
  {
    id: 'lps',
    category: 'For Liquidity Providers',
    name: 'USDC Insurance Pool',
    summary: 'Deposit USDC. Earn yield from real trade premiums.',
    detail: {
      label: 'Liquidity',
      headline: 'Back real trade. Earn real yield.',
      subtitle: 'For individuals and institutions deploying capital into trade finance.',
      body: 'Deposit USDC into Prova\'s insurance pool. Your capital backs active trade credit policies and earns a proportional share of every premium collected. Exposure is automatically diversified across all active policies — no manual rebalancing needed. Non-custodial: Prova never holds your keys, and you can withdraw whenever the pool has available liquidity.',
      bullets: [
        'Yield sourced from real trade premiums — not synthetic instruments',
        'Automatically diversified across all active policies',
        'Non-custodial — withdraw at any time',
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
              How Prova works
            </p>
            <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
              Pick your role.<br />Start in minutes.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              Whether you sell on credit, want to understand how claims work,
              or want to earn yield — every role connects to the same on-chain settlement layer.
            </p>
          </div>
          <a
            href="#faq"
            className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--brand-primary))] hover:underline underline-offset-4 shrink-0"
          >
            Have questions?
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
                Get started
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
