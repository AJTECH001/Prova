const POOLS = [
  {
    category: 'For Sellers',
    title: 'Always covered.',
    description:
      'Selling goods or services on credit? Enter your buyer\'s address, invoice amount, and due date — Prova evaluates the buyer\'s payment history and sets your coverage terms automatically. If the buyer doesn\'t pay on time, your claim is settled from the insurance pool. No broker, no adjuster, no weeks of waiting.',
    tags: ['Automatic claim payout', 'Private credit scoring'],
  },
  {
    category: 'Privacy First',
    title: 'Your data, never exposed.',
    description:
      'When Prova evaluates your buyer\'s credit, every score is encrypted before it touches the blockchain. The premium is calculated on encrypted values — no raw financial data is ever readable on-chain. Your policy terms are private. Your claim is validated without exposing amounts. No broker ever sees your books.',
    tags: ['FHE-encrypted scoring', 'Zero data leaks'],
  },
  {
    category: 'For Liquidity Providers',
    title: 'Earn and withdraw.',
    description:
      'Deposit USDC into the insurance pool and earn yield backed by real trade transactions. Your capital supports active policies and earns a proportional share of premiums collected. Automatically diversified across all policies. Non-custodial — you control your funds at all times.',
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
              Built for modern trade finance
            </p>
            <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
              Three roles.<br />One protocol.
            </h2>
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              Whether you sell on credit, provide liquidity, or underwrite risk —
              every role connects to the same escrow settlement layer on Arbitrum.
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
