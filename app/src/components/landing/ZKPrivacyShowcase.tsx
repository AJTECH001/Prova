const FEATURES = [
  {
    title: 'Buyer Credit, Always Encrypted',
    description:
      "Creditworthiness evaluated via Fhenix CoFHE — scores computed on encrypted values on-chain. No plaintext financial data exposed at any point.",
  },
  {
    title: 'Passkey Smart Accounts',
    description:
      'ZeroDev ERC-4337 account abstraction. Sign in with a device passkey — no seed phrases, no browser wallet extensions needed.',
  },
  {
    title: 'Verifiable on Arbitrum',
    description:
      "Every escrow, policy, and settlement recorded on Arbitrum. Publicly verifiable — while credit scores and coverage amounts stay encrypted.",
  },
  {
    title: 'Works wherever you trade',
    description:
      'Any business, any market. Country and buyer risk factors are built into the underwriting model — coverage terms adjust automatically.',
  },
];

const FLOW_STEPS = ['Seller Wallet', 'Secure Escrow', 'Encrypted Underwriting', 'Settlement'];

const FLOW_BULLETS = [
  'Seller creates an on-chain escrow — buyer funds it before the due date',
  "Prova evaluates the buyer's creditworthiness using CoFHE — premium set automatically",
  'Buyer pays → funds release. Buyer defaults → claim settled after the 7-day window',
];

export function ZKPrivacyShowcase() {
  return (
    <section id="zk" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Left — feature pillars */}
          <div className="space-y-10">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ds-ink-400))]">
                Privacy &amp; Security
              </p>
              <h2 className="text-4xl font-black tracking-tight text-[hsl(var(--ds-ink-900))] sm:text-5xl">
                Institutional infrastructure.<br />
                No institutional friction.
              </h2>
              <p className="text-base text-[hsl(var(--ds-ink-600))]">
                FHE-encrypted underwriting, passkey accounts, and auditable on-chain settlement — available to any business selling on credit.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="space-y-2">
                  <h4 className="font-bold text-[hsl(var(--ds-ink-900))]">{f.title}</h4>
                  <p className="text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — how it works */}
          <div className="flex items-center">
            <div className="w-full rounded-2xl border border-[hsl(var(--ds-line-light))] bg-[hsl(var(--ds-surface-section))] p-8 space-y-7">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ds-ink-400))]">
                  How it works
                </p>
                <h3 className="text-2xl font-black tracking-tight text-[hsl(var(--ds-ink-900))]">
                  From wallet to settlement.
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--ds-ink-600))]">
                  How an invoice moves through Prova: from your passkey wallet into a secure escrow, through encrypted underwriting, to final settlement.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {FLOW_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--ds-line-strong))] bg-white px-4 py-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ds-teal-600))]" />
                      <span className="text-xs font-semibold text-[hsl(var(--ds-ink-600))]">{step}</span>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <svg className="h-4 w-4 shrink-0 text-[hsl(var(--ds-ink-400))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <ul className="space-y-3 border-t border-[hsl(var(--ds-line-light))] pt-6">
                {FLOW_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-[hsl(var(--ds-ink-600))]">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ds-teal-600))]" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
