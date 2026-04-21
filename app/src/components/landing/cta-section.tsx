import { Link } from '@tanstack/react-router';

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 py-28 text-center sm:px-6 lg:px-8">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.06)] blur-[120px]" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl">
        {/* Label */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
            Ready to get started
          </span>
        </div>

        <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.08] tracking-tight text-[hsl(var(--text-primary))]">
          Let's build what trade<br className="hidden sm:block" /> credit should be.
        </h2>

        <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-[hsl(var(--text-secondary))]">
          FHE-encrypted. Escrow-settled. Built on Arbitrum.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/auth"
            className="flex w-full items-center justify-center rounded-full bg-[hsl(var(--brand-primary))] px-8 py-3 text-sm font-bold text-[hsl(var(--text-on-brand))] shadow-lg shadow-[hsl(var(--brand-primary)/0.2)] transition-colors hover:bg-[hsl(var(--brand-primary-hover))] sm:w-auto"
          >
            Get started
          </Link>
          <a
            href="https://cal.com/jamiu-damilola-alade-zgtrvz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--border-strong))] px-8 py-3 text-sm font-semibold text-[hsl(var(--text-muted))] transition-colors hover:border-[hsl(var(--brand-primary)/0.4)] hover:text-[hsl(var(--text-primary))] sm:w-auto"
          >
            Schedule a call
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
