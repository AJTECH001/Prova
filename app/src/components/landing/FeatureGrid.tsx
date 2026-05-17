const POOLS = [
  {
    category: 'For Sellers',
    title: 'Always covered.',
    description: 'Automatic coverage from the moment your invoice is issued. Paid from the insurance pool if the buyer defaults.',
    tags: ['Automatic claim payout', 'Private credit scoring'],
  },
  {
    category: 'Privacy First',
    title: 'Your data, never exposed.',
    description: 'Credit scoring runs on encrypted values — no raw financial data is ever readable on-chain.',
    tags: ['FHE-encrypted scoring', 'Zero data leaks'],
  },
  {
    category: 'For Liquidity Providers',
    title: 'Earn and withdraw.',
    description: 'Deposit USDC and earn a share of every premium collected, automatically diversified across all active policies.',
    tags: ['USDC yield', 'Non-custodial'],
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
              Built for modern trade finance
            </p>
            <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-5xl">
              Three roles.<br />One protocol.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {['FHE-Encrypted', 'Non-Custodial', 'Arbitrum L2'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[hsl(var(--border-strong))] px-4 py-1.5 text-xs font-semibold text-[hsl(var(--text-secondary))]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {POOLS.map((pool) => (
            <div
              key={pool.category}
              className="flex flex-col justify-between rounded-2xl bg-[hsl(var(--bg-surface-alt))] p-8 transition-shadow hover:shadow-md"
            >
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--text-muted))]">
                  {pool.category}
                </p>
                <h3 className="text-2xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  {pool.title}
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  {pool.description}
                </p>
              </div>

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
