const PARTNERS = [
  {
    name: 'Arbitrum',
    logo: (
      <svg viewBox="0 0 124 28" fill="none" className="h-5 w-auto" aria-label="Arbitrum">
        <path d="M14 0C6.268 0 0 6.268 0 14s6.268 14 14 14 14-6.268 14-14S21.732 0 14 0zm4.87 20.496L14 11.8l-4.87 8.696H6.858L14 7.504l7.142 12.992H18.87z" fill="currentColor"/>
        <text x="32" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">Arbitrum</text>
      </svg>
    ),
  },
  {
    name: 'ZeroDev',
    logo: (
      <svg viewBox="0 0 110 28" fill="none" className="h-5 w-auto" aria-label="ZeroDev">
        <rect x="0" y="4" width="20" height="20" rx="5" fill="currentColor" opacity="0.9"/>
        <text x="2" y="19" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="13" fill="white">Z</text>
        <text x="28" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">ZeroDev</text>
      </svg>
    ),
  },
  {
    name: 'Fhenix',
    logo: (
      <svg viewBox="0 0 96 28" fill="none" className="h-5 w-auto" aria-label="Fhenix">
        <circle cx="10" cy="14" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 14h8M10 10v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <text x="26" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">Fhenix</text>
      </svg>
    ),
  },
  {
    name: 'Circle',
    logo: (
      <svg viewBox="0 0 82 28" fill="none" className="h-5 w-auto" aria-label="Circle · USDC">
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2"/>
        <text x="10" y="19" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="11" fill="currentColor">$</text>
        <text x="32" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">Circle</text>
      </svg>
    ),
  },
  {
    name: 'ReineiraOS',
    logo: (
      <svg viewBox="0 0 118 28" fill="none" className="h-5 w-auto" aria-label="ReineiraOS">
        <rect x="0" y="5" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 9h8M5 14h5M5 19h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <text x="26" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">ReineiraOS</text>
      </svg>
    ),
  },
  {
    name: 'OpenZeppelin',
    logo: (
      <svg viewBox="0 0 128 28" fill="none" className="h-5 w-auto" aria-label="OpenZeppelin">
        <path d="M14 3L3 25h22L14 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 19l5-10 5 10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <text x="32" y="20" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">OpenZeppelin</text>
      </svg>
    ),
  },
];

export function PartnersBar() {
  return (
    <div className="border-b border-[hsl(var(--border-subtle))] bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--text-faint))]">
          Built with &amp; powered by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="text-[hsl(var(--text-muted))] opacity-50 grayscale transition-all duration-200 hover:opacity-90 hover:grayscale-0"
            >
              {p.logo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
