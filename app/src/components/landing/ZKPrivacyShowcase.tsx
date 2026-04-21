const FEATURES = [
  {
    title: 'Buyer Credit, Always Encrypted',
    description:
      'Your buyer\'s creditworthiness is evaluated using Fhenix CoFHE. The underwriting contract scores encrypted values on-chain — no plaintext financial data is ever exposed or stored at any point.',
  },
  {
    title: 'Passkey Smart Accounts',
    description:
      'Built on ZeroDev ERC-4337 account abstraction. Sign in and transact with a device passkey — no seed phrases, no browser wallet extensions required.',
  },
  {
    title: 'Verifiable on Arbitrum',
    description:
      'Every escrow, policy issuance, and settlement is recorded on Arbitrum L2. Transactions are publicly verifiable — while sensitive values like credit scores and coverage amounts remain encrypted.',
  },
  {
    title: 'Works wherever you trade',
    description:
      'Prova works for any business selling on credit, anywhere in the world. Country and industry risk factors are built into the underwriting model — coverage terms adjust based on where your buyer operates.',
  },
];

const FLOW_STEPS = ['Seller Wallet', 'Secure Escrow', 'Encrypted Underwriting', 'Settlement'];

const FLOW_BULLETS = [
  'Seller creates an on-chain escrow for the invoice — buyer funds it before the due date',
  'Prova evaluates the buyer\'s creditworthiness using CoFHE — premium set automatically',
  'Buyer pays → funds release to seller. Buyer defaults → seller initiates claim after 7-day window',
];

export function ZKPrivacyShowcase() {
  return (
    <section id="zk" className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* Left — compliance pillar */}
          <div className="space-y-10">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                Privacy &amp; Security
              </p>
              <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
                Institutional infrastructure.<br />
                No institutional friction.
              </h2>
              <p className="text-lg text-[hsl(var(--text-secondary))]">
                FHE-encrypted credit evaluation, ERC-4337 passkey accounts, and
                auditable on-chain settlement — available to any business selling on credit.
              </p>
            </div>

            {/* 2×2 feature grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="space-y-2">
                  <h4 className="font-bold text-[hsl(var(--text-primary))]">{f.title}</h4>
                  <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — how it works card */}
          <div className="flex items-center">
            <div className="w-full rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-alt))] p-10 space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-muted))]">
                  How it works
                </p>
                <h3 className="text-3xl font-black tracking-tight text-[hsl(var(--text-primary))]">
                  From wallet to settlement.
                </h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--text-secondary))]">
                  How an invoice moves through Prova: from your passkey wallet into a
                  secure on-chain escrow, through encrypted underwriting, to final settlement.
                </p>
              </div>

              {/* Flow steps */}
              <div className="flex flex-wrap items-center gap-2">
                {FLOW_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border-strong))] bg-white px-4 py-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-primary))]" />
                      <span className="text-xs font-semibold text-[hsl(var(--text-secondary))]">{step}</span>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <svg className="h-4 w-4 shrink-0 text-[hsl(var(--text-muted))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Bullets */}
              <ul className="space-y-3">
                {FLOW_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm text-[hsl(var(--text-secondary))]">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--brand-primary))]" />
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
