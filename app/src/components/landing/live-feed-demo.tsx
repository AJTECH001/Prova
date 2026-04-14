import { useState } from 'react';

const POOLS = [
  {
    id: 'merchants',
    category: 'For Exporters',
    name: 'Trade Credit Coverage',
    summary: 'Insure invoices ($5K–$50K) against buyer default on Arbitrum.',
    detail: {
      label: 'Coverage',
      headline: 'Invoice insured. Buyer pays or escrow does.',
      subtitle: 'For SME exporters in emerging markets who cannot absorb payment defaults.',
      body: 'Create a ConfidentialEscrow for your trade invoice. The buyer deposits USDC into escrow — if payment conditions are met, funds release automatically. If not, your coverage policy triggers a claim payout from the PremiumPool. Your credit score is evaluated using FHE encryption, so no sensitive financial data is ever exposed on-chain.',
      bullets: [
        'FHE-encrypted credit scoring — no plaintext data on-chain',
        'ConfidentialEscrow holds buyer USDC until conditions are met',
        'Claim settled automatically on invoice default',
      ],
    },
  },
  {
    id: 'underwriters',
    category: 'For Underwriters',
    name: 'Risk Underwriting Pool',
    summary: 'Deploy a ProvaUnderwriterPolicy and earn the premium spread.',
    detail: {
      label: 'Underwriting',
      headline: 'Set your policy. Earn the spread.',
      subtitle: 'For institutions and risk desks building programmable on-chain books.',
      body: 'Deploy a ProvaUnderwriterPolicy contract with custom risk parameters. The FHE computation evaluates encrypted exporter credit scores and returns a basis-point premium — without ever decrypting the underlying data. Accept or reject applications, set exposure limits, and collect premium income on every active policy you back.',
      bullets: [
        'Deploy ProvaUnderwriterPolicy with custom risk parameters',
        'FHE evaluates credit scores without decrypting plaintext',
        'Premium income on every policy your pool backs',
      ],
    },
  },
  {
    id: 'lps',
    category: 'For Liquidity Providers',
    name: 'PremiumPool — USDC Yield',
    summary: 'Deposit USDC into the PremiumPool and earn yield from trade premiums.',
    detail: {
      label: 'Liquidity',
      headline: 'Deposit USDC. Back real trade.',
      subtitle: 'Yield backed by verified trade finance assets, not synthetic instruments.',
      body: 'Deposit USDC into the PremiumPool. Your capital backs active trade credit policies and earns yield proportional to the premiums collected. On claim, the pool pays out to the beneficiary. Diversification is automatic across all policies in the pool. Non-custodial — Prova never holds your keys.',
      bullets: [
        'Yield sourced from real trade premium flows',
        'Diversified automatically across active policies',
        'Non-custodial escrow — your keys, your capital',
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
              Three roles.<br />One escrow.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              Whether you export goods, underwrite risk, or provide liquidity —
              every role connects to the same ConfidentialEscrow settlement layer.
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
