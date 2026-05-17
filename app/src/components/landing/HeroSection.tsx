import Link from 'next/link'

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm pb-8 pr-8">
      <div className="relative w-full rounded-2xl border border-[hsl(var(--border-default))] bg-white p-6 shadow-2xl shadow-black/[0.06] ring-1 ring-black/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
            <span className="text-xs font-semibold text-[hsl(var(--text-muted))]">Coverage active</span>
          </div>
          <span className="rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-700">Insured</span>
        </div>

        <p className="mt-4 text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">$48,000</p>
        <p className="mt-0.5 text-xs text-[hsl(var(--text-muted))]">USDC · Due Mar 15, 2026</p>

        <div className="mt-4 h-px bg-[hsl(var(--border-subtle))]" />

        <div className="mt-4 grid grid-cols-2 gap-4">
          {[
            ['Buyer', 'Account ••••3F4A'],
            ['Coverage', 'Full invoice'],
            ['Premium', '$240.00'],
            ['Status', 'Active'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{label}</p>
              <p className={`mt-0.5 text-xs font-semibold ${label === 'Status' ? 'text-[var(--status-success)]' : 'text-[hsl(var(--text-primary))]'}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-[hsl(var(--bg-surface-alt))] px-4 py-3">
          <p className="text-xs text-[hsl(var(--text-muted))]">Awaiting buyer payment</p>
          <p className="text-xs font-semibold text-[hsl(var(--text-primary))]">30 days left</p>
        </div>
      </div>

      {/* Floating success chip */}
      <div className="absolute bottom-0 right-0 flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border-default))] bg-white px-4 py-3 shadow-lg shadow-black/[0.06] ring-1 ring-black/[0.04]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50">
          <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold text-[hsl(var(--text-primary))]">Claim settled</p>
          <p className="text-[10px] text-[hsl(var(--text-muted))]">$48,000 USDC · 1 transaction</p>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-24 pt-[80px] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.04)] blur-[130px]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24 lg:py-24">

        {/* Left — copy */}
        <div className="text-center lg:text-left">
          <div className="mb-8 inline-flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-primary))]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
              Trade credit insurance
            </span>
          </div>

          <h1 className="text-[clamp(2.4rem,5.5vw,5.5rem)] font-black leading-[1.0] tracking-tight text-[hsl(var(--text-primary))]">
            Sell on credit.<br />
            <span className="text-[hsl(var(--brand-primary))]">Get paid either way.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[hsl(var(--text-secondary))] lg:mx-0 lg:text-lg">
            Instant coverage for any business selling on credit. If a buyer doesn't pay, your claim is settled automatically — no broker, no paperwork.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/auth"
              className="flex w-full items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] px-8 py-3.5 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-lg shadow-[hsl(var(--brand-primary)/0.2)] transition-all hover:bg-[hsl(var(--brand-primary-hover))] sm:w-auto"
            >
              Get started
            </Link>
            <a
              href="https://cal.com/jamiu-damilola-alade-zgtrvz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--border-strong))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--text-muted))] transition-colors hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--text-primary))] sm:w-auto"
            >
              Schedule a call
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
            {['Non-custodial', 'FHE-encrypted', 'Built on Arbitrum'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))]">
                <svg className="h-3 w-3 text-[hsl(var(--brand-primary))]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="flex justify-center lg:justify-end">
          <ProductMockup />
        </div>
      </div>
    </section>
  )
}
