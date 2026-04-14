const POOLS = [
  {
    category: 'For Exporters',
    title: 'Always covered.',
    description:
      'Protect invoices from $5K to $50K against buyer default and political risk. Coverage issued on-chain in seconds — no broker, no paperwork, no exposure of your financial data. Your credit score stays encrypted throughout.',
    tags: ['FHE-encrypted scoring', 'Auto-claim'],
  },
  {
    category: 'For Underwriters',
    title: 'Set your terms.',
    description:
      'Deploy a ProvaUnderwriterPolicy with custom risk logic. Evaluate exporter applications using FHE-encrypted credit scores — without accessing any plaintext financial data. Earn the premium spread on every active policy.',
    tags: ['Programmable policy', 'Premium income'],
  },
  {
    category: 'For Liquidity Providers',
    title: 'Earn and withdraw.',
    description:
      'Deposit USDC into the PremiumPool and earn yield backed by real trade finance assets. Exposure is diversified across active policies. Non-custodial escrow — you retain ownership of capital at all times.',
    tags: ['USDC yield', 'Non-custodial'],
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
              Built for emerging-market trade finance
            </p>
            <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
              Three roles.<br />One protocol.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              FHE-encrypted underwriting, on-chain escrow settlement, and USDC
              liquidity pools. For exporters, underwriters, and LPs — on Arbitrum.
            </p>
          </div>

          {/* Tag pills */}
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
