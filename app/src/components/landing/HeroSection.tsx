import { Link } from '@tanstack/react-router';

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-20 pt-[60px] text-center sm:px-6 lg:px-8">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--brand-primary)/0.05)] blur-[140px]" />
      </div>

      {/* Badge */}
      <div className="mb-10 flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[hsl(var(--brand-primary))]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--brand-primary))]">
          Trade. Protected.
        </span>
      </div>

      {/* Headline */}
      <h1 className="w-full max-w-5xl font-black leading-[1.02] tracking-tight">
        <span className="block whitespace-nowrap text-[clamp(1.8rem,5.5vw,7rem)] text-[hsl(var(--text-primary))]">Sell on credit.</span>
        <span className="block whitespace-nowrap text-[clamp(1.8rem,5.5vw,7rem)] text-[hsl(var(--brand-primary))]">Get paid either way.</span>
      </h1>

      {/* Subtext */}
      <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-[hsl(var(--text-secondary))] sm:text-lg">
        Trade credit insurance for any business selling goods or services on credit. Instant coverage, automatic payouts if a buyer defaults — no broker, no paperwork, no waiting.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
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

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">Scroll</span>
        <svg className="h-5 w-5 animate-bounce text-[hsl(var(--text-muted))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
