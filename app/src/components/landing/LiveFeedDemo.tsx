'use client'

import { useState } from 'react'

const POOLS = [
  {
    id: 'merchants',
    category: 'For Sellers',
    name: 'Trade Credit Coverage',
    summary: "Enter your buyer's details. Prova handles the rest.",
    detail: {
      label: 'Coverage',
      headline: 'You sell. We make sure you get paid.',
      subtitle: 'For any business selling goods or services on credit.',
      body: "Enter buyer details and your invoice terms. If the buyer pays, funds release directly to you. If they don't, one claim transaction pays you from the insurance pool.",
      bullets: [
        "Buyer risk evaluated automatically — no broker required",
        'Premium set by the protocol, not negotiation',
        'Instant payout when claim conditions are met',
      ],
    },
  },
  {
    id: 'claims',
    category: 'How Claims Work',
    name: 'Claim Settlement',
    summary: "Buyer didn't pay? One transaction. Instant payout.",
    detail: {
      label: 'Claims',
      headline: 'One action. Funds in your wallet.',
      subtitle: 'No adjuster. No forms. No waiting weeks.',
      body: "After a 7-day waiting window, submit one transaction. The contract verifies the condition and releases your payout directly from the pool — no manual review, no approval process.",
      bullets: [
        '7-day window opens automatically after the due date',
        'One transaction initiates and settles the claim',
        'No adjuster, no forms, no delay',
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
      subtitle: 'For individuals and institutions deploying capital.',
      body: "Deposit USDC to back active trade credit policies. Earn a proportional share of every premium collected, auto-diversified across all policies. Non-custodial — withdraw at any time.",
      bullets: [
        'Yield sourced from real trade premiums',
        'Auto-diversified across all active policies',
        'Non-custodial — withdraw at any time',
      ],
    },
  },
]

export function LiveFeedDemo() {
  const [activeId, setActiveId] = useState('merchants')
  const active = POOLS.find((p) => p.id === activeId)!

  return (
    <section id="demo" className="bg-[hsl(var(--ds-surface-section))] py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ds-ink-400))]">
              How Prova works
            </p>
            <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--ds-ink-900))] sm:text-5xl">
              Pick your role.<br />Start in minutes.
            </h2>
          </div>
          <a
            href="#faq"
            className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[hsl(var(--ds-teal-600))] underline-offset-4 hover:underline"
          >
            Have questions?
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">

          <div className="flex flex-col gap-3">
            {POOLS.map((pool) => {
              const isActive = pool.id === activeId
              return (
                <button
                  key={pool.id}
                  onClick={() => setActiveId(pool.id)}
                  className={`w-full rounded-2xl border p-6 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-[hsl(var(--ds-teal-600)/0.4)] bg-white shadow-sm'
                      : 'border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] hover:border-[hsl(var(--ds-line-strong))]'
                  }`}
                >
                  <p className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${isActive ? 'text-[hsl(var(--ds-teal-600))]' : 'text-[hsl(var(--ds-ink-400))]'}`}>
                    {pool.category}
                  </p>
                  <p className="text-base font-black text-[hsl(var(--ds-ink-900))]">{pool.name}</p>
                  <p className="mt-1.5 text-sm text-[hsl(var(--ds-ink-600))]">{pool.summary}</p>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-[hsl(var(--ds-line-light))] bg-white p-10 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--ds-teal-600))]">
              {active.detail.label}
            </p>
            <h3 className="text-3xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">
              {active.detail.headline}
            </h3>
            <p className="mt-2 text-sm font-semibold text-[hsl(var(--ds-ink-600))]">
              {active.detail.subtitle}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
              {active.detail.body}
            </p>

            <ul className="mt-6 space-y-3">
              {active.detail.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm font-semibold text-[hsl(var(--ds-ink-600))]">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-teal-600))]" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <a
                href="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ds-teal-600))] px-6 py-2.5 text-sm font-bold text-[hsl(var(--ds-surface-white))] shadow-md shadow-[hsl(var(--ds-teal-600)/0.2)] transition-colors hover:bg-[hsl(var(--ds-teal-700))]"
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
  )
}
