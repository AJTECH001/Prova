const POOLS = [
  {
    category: 'For Merchants',
    title: 'Always covered.',
    description:
      'Protect your accounts receivable instantly. No paperwork, no brokers, no exposure of sensitive financial data.',
    tags: ['Instant coverage', 'ZK-shielded'],
  },
  {
    category: 'For Underwriters',
    title: 'Set your terms.',
    description:
      'Design custom risk policies with programmable logic. Approve claims automatically using ZK-credit scores.',
    tags: ['Custom policies', 'Auto-settlement'],
  },
  {
    category: 'For Liquidity Providers',
    title: 'Earn and withdraw.',
    description:
      'Deposit stablecoins into underwriter tiers and earn institutional yields. Risk diversified across policies.',
    tags: ['Stable yields', 'Daily accrual'],
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header row */}
        <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              Built for the future of trade finance
            </p>
            <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
              Three pools.<br />Zero complexity.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              ZK-shielded underwriting, automated settlement, institutional liquidity.
              On the surface: apply, insure, earn.
            </p>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {['ZK-Verified', 'Non-Custodial', 'Institutional Grade'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[hsl(var(--border-strong))] px-4 py-1.5 text-xs font-semibold text-[hsl(var(--text-secondary))]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {POOLS.map((pool) => (
            <div
              key={pool.category}
              className="flex flex-col justify-between rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-8 transition-shadow hover:shadow-md"
            >
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--text-muted))]">
                  {pool.category}
                </p>
                <h3 className="text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  {pool.title}
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  {pool.description}
                </p>
              </div>

              {/* Bottom tags */}
              <div className="mt-8 flex flex-wrap gap-2">
                {pool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[hsl(var(--border-strong))] px-3 py-1 text-xs font-semibold text-[hsl(var(--text-secondary))]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
