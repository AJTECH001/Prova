import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

const FAQS = [
  {
    question: 'How is my coverage premium calculated?',
    answer:
      "Your premium is computed on-chain using Fully Homomorphic Encryption (FHE). The underwriting contract evaluates your buyer's payment history — days-to-pay, default rate, transaction volume — without ever reading the raw data in plaintext. The result is an encrypted premium in basis points applied to your invoice amount. Typical range is 0.5% to 5% depending on buyer risk.",
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
];

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[hsl(var(--brand-emerald))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function PricingPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>

        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-white px-4 pb-20 pt-[120px] text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.05)] blur-[120px]" />
          </div>
          <div className="mb-6 flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
              Transparent pricing
            </span>
          </div>
          <h1 className="max-w-3xl text-[clamp(2rem,5.5vw,4.5rem)] font-black leading-[1.04] tracking-tight text-[hsl(var(--text-primary))]">
            Pay per invoice.<br />Never per month.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[hsl(var(--text-secondary))]">
            No subscriptions, no setup fees, no brokers. Coverage premiums are calculated on-chain
            for each invoice — you see the rate before you commit.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="bg-[hsl(var(--bg-surface-alt))] py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              {/* Sellers */}
              <div className="flex flex-col rounded-2xl border border-[hsl(var(--border-default))] bg-white p-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--text-muted))]">
                  For sellers
                </p>
                <h2 className="mb-2 text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  Coverage premium
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  One-time fee per invoice. Dynamic rate set by FHE underwriting.
                </p>
                <div className="mb-8 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-6">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black text-[hsl(var(--text-primary))]">0.5</span>
                    <span className="mb-2 text-xl font-bold text-[hsl(var(--text-muted))]">– 5%</span>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">of invoice value, per invoice</p>
                </div>
                <ul className="space-y-3 text-sm text-[hsl(var(--text-secondary))]">
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
                  to="/auth"
                  className="mt-10 flex w-full items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-md shadow-[hsl(var(--brand-primary)/0.2)] transition-colors hover:bg-[hsl(var(--brand-primary-hover))]"
                >
                  Get coverage
                </Link>
              </div>

              {/* LPs */}
              <div className="flex flex-col rounded-2xl border border-[hsl(var(--border-default))] bg-white p-10">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--text-muted))]">
                  For liquidity providers
                </p>
                <h2 className="mb-2 text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  Earn yield
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  Deposit USDC into the insurance pool. Earn a share of every premium collected.
                </p>
                <div className="mb-8 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-6">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black text-[hsl(var(--text-primary))]">Pool</span>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">yield, proportional to your stake</p>
                </div>
                <ul className="space-y-3 text-sm text-[hsl(var(--text-secondary))]">
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
                  to="/auth"
                  className="mt-10 flex w-full items-center justify-center rounded-full border border-[hsl(var(--border-strong))] px-6 py-3 text-sm font-bold text-[hsl(var(--text-primary))] transition-colors hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--brand-primary))]"
                >
                  Start earning
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Fee table */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Full breakdown</p>
              <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--text-primary))]">What you pay. What you earn.</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border-default))]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))]">
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--text-muted))]">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--text-muted))]">Rate</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-[hsl(var(--text-muted))]">Who pays</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                  {[
                    { item: 'Coverage premium',    rate: '0.5% – 5% per invoice', who: 'Seller' },
                    { item: 'Monthly subscription', rate: 'None',                 who: '—' },
                    { item: 'Setup / onboarding',   rate: 'None',                 who: '—' },
                    { item: 'Claim processing fee',  rate: 'None',                 who: '—' },
                    { item: 'LP management fee',     rate: 'None',                 who: '—' },
                    { item: 'Gas fees (via AA)',      rate: 'Sponsored',            who: 'Prova' },
                  ].map((row) => (
                    <tr key={row.item} className="bg-white">
                      <td className="px-6 py-4 font-medium text-[hsl(var(--text-primary))]">{row.item}</td>
                      <td className="px-6 py-4 text-[hsl(var(--text-secondary))]">{row.rate}</td>
                      <td className="px-6 py-4 text-[hsl(var(--text-muted))]">{row.who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[hsl(var(--bg-surface-alt))] py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">Pricing questions</p>
              <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--text-primary))]">Common questions.</h2>
            </div>
            <div className="divide-y divide-[hsl(var(--border-subtle))] border-t border-[hsl(var(--border-subtle))]">
              {FAQS.map((faq, i) => (
                <div key={i} className="py-7">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="flex w-full items-center justify-between gap-8 text-left"
                  >
                    <span className="text-base font-bold text-[hsl(var(--text-primary))]">{faq.question}</span>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${openIndex === i ? 'border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))] text-[hsl(var(--text-on-brand))]' : 'border-[hsl(var(--border-strong))] text-[hsl(var(--text-primary))]'}`}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {openIndex === i ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M12 5v14M5 12h14" />}
                      </svg>
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-white px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.06)] blur-[120px]" />
          </div>
          <div className="mx-auto max-w-xl">
            <div className="mb-6 flex items-center justify-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">Start today</span>
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-tight tracking-tight text-[hsl(var(--text-primary))]">
              Cover your first invoice.<br />Pay only when you do.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-base text-[hsl(var(--text-secondary))]">
              No commitment. Create an account and get your first coverage quote in under two minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                to="/auth"
                className="flex w-full items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] px-8 py-3 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-lg shadow-[hsl(var(--brand-primary)/0.2)] transition-colors hover:bg-[hsl(var(--brand-primary-hover))] sm:w-auto"
              >
                Get started free
              </Link>
              <Link
                to="/contact"
                className="flex w-full items-center justify-center rounded-full border border-[hsl(var(--border-strong))] px-8 py-3 text-sm font-semibold text-[hsl(var(--text-muted))] transition-colors hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--text-primary))] sm:w-auto"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
