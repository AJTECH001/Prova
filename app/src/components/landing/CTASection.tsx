import Link from 'next/link'

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ds-surface-section))] px-4 py-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--ds-teal-600)/0.06)] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ds-teal-600))]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--ds-teal-600))]">
            Ready when you are
          </span>
        </div>

        <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.08] tracking-tight text-[hsl(var(--ds-ink-900))]">
          Protect your next invoice.
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[hsl(var(--ds-ink-600))]">
          Sign up in minutes. Coverage that works the moment you need it.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth"
            className="flex w-full items-center justify-center rounded-full bg-[hsl(var(--ds-teal-600))] px-8 py-3.5 text-sm font-bold text-[hsl(var(--ds-surface-white))] shadow-lg shadow-[hsl(var(--ds-teal-600)/0.2)] transition-colors hover:bg-[hsl(var(--ds-teal-700))] sm:w-auto"
          >
            Get started
          </Link>
          <a
            href="https://cal.com/jamiu-damilola-alade-zgtrvz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--ds-line-strong))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--ds-ink-400))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)] hover:text-[hsl(var(--ds-ink-900))] sm:w-auto"
          >
            Schedule a call
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
