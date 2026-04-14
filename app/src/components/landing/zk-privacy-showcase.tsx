const FEATURES = [
  {
    title: 'FHE-Encrypted Credit Scores',
    description:
      'Exporter credit is scored using Fhenix CoFHE. The underwriter evaluates encrypted values on-chain — no plaintext financial data is ever exposed or stored.',
  },
  {
    title: 'Passkey Smart Accounts',
    description:
      'Built on ZeroDev ERC-4337 account abstraction. Sign in and transact with a device passkey — no seed phrases, no browser wallet extensions required.',
  },
  {
    title: 'Auditable on Arbitrum',
    description:
      'Every escrow creation, policy issuance, claim trigger, and settlement is recorded on Arbitrum L2. Fully auditable by anyone, at any time.',
  },
  {
    title: 'Cross-border ready',
    description:
      'Designed for emerging-market corridors — Nigeria↔UK, Kenya↔India. Jurisdiction-aware policy filters and KYC/AML hooks built into the ReineiraOS layer.',
  },
];

const FLOW_STEPS = ['Exporter Wallet', 'ConfidentialEscrow', 'FHE Underwriter', 'Settlement'];

const FLOW_BULLETS = [
  'Buyer deposits USDC into ConfidentialEscrow on invoice creation',
  'CoFHE evaluates encrypted credit score — premium set in basis points',
  'On payment due date: escrow releases or claim triggers from PremiumPool',
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
                Privacy &amp; Infrastructure
              </p>
              <h2 className="text-5xl font-black tracking-tight text-[hsl(var(--text-primary))] sm:text-6xl">
                Institutional infrastructure.<br />
                No institutional friction.
              </h2>
              <p className="text-lg text-[hsl(var(--text-secondary))]">
                FHE-encrypted credit evaluation, ERC-4337 passkey accounts, and
                auditable on-chain settlement — available to any SME exporter.
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
                  How an invoice moves through the Prova protocol: from passkey wallet,
                  into ConfidentialEscrow, through FHE underwriting, to final settlement.
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
