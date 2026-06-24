'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { LandingFooter } from '@/components/landing/LandingFooter'

const FAQS = [
  {
    question: 'How is my coverage premium calculated?',
    answer:
      "Your premium is computed on-chain using Fully Homomorphic Encryption (FHE). The underwriting contract evaluates your buyer's payment history — days-to-pay, default rate, transaction volume — without ever reading the raw data in plaintext. The result is an encrypted premium in basis points applied to your invoice amount. Typical range is 1.5% to 10% depending on buyer risk.",
  },
  {
    question: 'Are there any monthly or setup fees?',
    answer:
      "No. Prova has no subscription fees, no onboarding fees, and no monthly minimums. You pay a coverage premium only when you purchase insurance for an invoice. If you don't issue invoices that month, you pay nothing.",
  },
  {
    question: 'Can I see my premium before I commit?',
    answer:
      'Yes. When you create an escrow, Prova returns the computed premium before you confirm the transaction. You can review the rate and decide whether to proceed — nothing is charged until you sign and submit.',
  },
  {
    question: 'How does LP yield work?',
    answer:
      'When LPs deposit USDC into the insurance pool, their capital backs active trade credit policies. Every time a seller purchases coverage, a premium flows into the pool. LPs earn a proportional share of those premiums based on their stake weight, automatically diversified across all active policies.',
  },
]

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[hsl(var(--ds-green-main))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function PricingPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>

        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-white px-4 pb-20 pt-[120px] text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--ds-teal-600)/0.05)] blur-[120px]" />
          </div>
          <div className="mb-6 flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--ds-teal-600))]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--ds-teal-600))]">
              Transparent pricing
            </span>
          </div>
          <h1 className="max-w-3xl text-[clamp(2rem,5.5vw,4.5rem)] font-black leading-[1.04] tracking-tight text-[hsl(var(--ds-ink-900))]">
            Pay per invoice.<br />Never per month.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[hsl(var(--ds-ink-600))]">
            No subscriptions, no setup fees, no brokers. Coverage premiums are calculated on-chain
            for each invoice — you see the rate before you commit.
          </p>
        </section>

        <section className="bg-[hsl(var(--ds-surface-section))] py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              <div className="flex flex-col rounded-2xl border border-[hsl(var(--ds-line-light))] bg-white p-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--ds-ink-400))]">For sellers</p>
                <h2 className="mb-2 text-3xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">Coverage premium</h2>
                <p className="mb-8 text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
                  One-time fee per invoice. Dynamic rate set by FHE underwriting.
                </p>
                <div className="mb-8 rounded-xl border border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] p-6">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black text-[hsl(var(--ds-ink-900))]">1.5</span>
                    <span className="mb-2 text-xl font-bold text-[hsl(var(--ds-ink-400))]">– 10%</span>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--ds-ink-600))]">of invoice value, per invoice</p>
                </div>
                <ul className="space-y-3 text-sm text-[hsl(var(--ds-ink-600))]">
                  {[
                    'Rate shown before you commit',
                    'Up to 100% invoice coverage',
                    'Automatic payout on buyer default',
                    'No paperwork, no adjuster',
                    'No monthly subscription',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  className="mt-10 flex w-full items-center justify-center rounded-full bg-[hsl(var(--ds-teal-600))] px-6 py-3 text-sm font-bold text-[hsl(var(--ds-surface-white))] shadow-md shadow-[hsl(var(--ds-teal-600)/0.2)] transition-colors hover:bg-[hsl(var(--ds-teal-700))]"
                >
                  Get coverage
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-[hsl(var(--ds-line-light))] bg-white p-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--ds-ink-400))]">For liquidity providers</p>
                <h2 className="mb-2 text-3xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">Earn yield</h2>
                <p className="mb-8 text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
                  Deposit USDC into the insurance pool. Earn a share of every premium collected.
                </p>
                <div className="mb-8 rounded-xl border border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] p-6">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black text-[hsl(var(--ds-ink-900))]">Pool</span>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--ds-ink-600))]">yield, proportional to your stake</p>
                </div>
                <ul className="space-y-3 text-sm text-[hsl(var(--ds-ink-600))]">
                  {[
                    'Earn from day one of staking',
                    'Proportional share of all premiums',
                    'Auto-diversified across policies',
                    'Withdraw anytime (subject to liquidity)',
                    'Non-custodial — your keys, your funds',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckIcon />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  className="mt-10 flex w-full items-center justify-center rounded-full border border-[hsl(var(--ds-line-strong))] px-6 py-3 text-sm font-bold text-[hsl(var(--ds-ink-900))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)] hover:text-[hsl(var(--ds-teal-600))]"
                >
                  Start earning
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ds-ink-400))]">Full breakdown</p>
              <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">What you pay. What you earn.</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[hsl(var(--ds-line-light))]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))]">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--ds-ink-400))]">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--ds-ink-400))]">Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--ds-ink-400))]">Who pays</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--ds-line-light))]">
                  {[
                    { item: 'Coverage premium',     rate: '1.5% – 10% per invoice', who: 'Seller' },
                    { item: 'Monthly subscription', rate: 'None',                   who: '—' },
                    { item: 'Setup / onboarding',   rate: 'None',                   who: '—' },
                    { item: 'Claim processing fee', rate: 'None',                   who: '—' },
                    { item: 'LP management fee',    rate: 'None',                   who: '—' },
                    { item: 'Gas fees (via AA)',     rate: 'Sponsored',              who: 'Prova' },
                  ].map((row) => (
                    <tr key={row.item} className="bg-white">
                      <td className="px-6 py-4 font-medium text-[hsl(var(--ds-ink-900))]">{row.item}</td>
                      <td className="px-6 py-4 text-[hsl(var(--ds-ink-600))]">{row.rate}</td>
                      <td className="px-6 py-4 text-[hsl(var(--ds-ink-400))]">{row.who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-[hsl(var(--ds-surface-section))] py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ds-ink-400))]">Pricing questions</p>
              <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">Common questions.</h2>
            </div>
            <div className="divide-y divide-[hsl(var(--ds-line-light))] border-t border-[hsl(var(--ds-line-light))]">
              {FAQS.map((faq, i) => (
                <div key={i} className="py-7">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="flex w-full items-center justify-between gap-8 text-left"
                  >
                    <span className="text-base font-bold text-[hsl(var(--ds-ink-900))]">{faq.question}</span>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${openIndex === i ? 'border-[hsl(var(--ds-teal-600))] bg-[hsl(var(--ds-teal-600))] text-[hsl(var(--ds-surface-white))]' : 'border-[hsl(var(--ds-line-strong))] text-[hsl(var(--ds-ink-900))]'}`}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {openIndex === i ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M12 5v14M5 12h14" />}
                      </svg>
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--ds-teal-600)/0.06)] blur-[120px]" />
          </div>
          <div className="mx-auto max-w-xl">
            <div className="mb-6 flex items-center justify-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--ds-teal-600))]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--ds-teal-600))]">Start today</span>
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-tight tracking-tight text-[hsl(var(--ds-ink-900))]">
              Cover your first invoice.<br />Pay only when you do.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-base text-[hsl(var(--ds-ink-600))]">
              No commitment. Create an account and get your first coverage quote in under two minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/auth"
                className="flex w-full items-center justify-center rounded-full bg-[hsl(var(--ds-teal-600))] px-8 py-3 text-sm font-bold text-[hsl(var(--ds-surface-white))] shadow-lg shadow-[hsl(var(--ds-teal-600)/0.2)] transition-colors hover:bg-[hsl(var(--ds-teal-700))] sm:w-auto"
              >
                Get started free
              </Link>
              <Link
                href="/contact"
                className="flex w-full items-center justify-center rounded-full border border-[hsl(var(--ds-line-strong))] px-8 py-3 text-sm font-semibold text-[hsl(var(--ds-ink-400))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)] hover:text-[hsl(var(--ds-ink-900))] sm:w-auto"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  )
}
