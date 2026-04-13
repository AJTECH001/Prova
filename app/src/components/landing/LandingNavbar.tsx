import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { WalletConnectButton } from '@/components/features/wallet-connect-button';

const NAV_LINKS = [
  { label: 'Overview',    href: '#features' },
  { label: 'How it works', href: '#demo' },
  { label: 'Privacy',     href: '#zk' },
];

export function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[hsl(var(--border-subtle))] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <img src="/prova_logo.png" alt="Prova" className="h-7 w-7 rounded-md object-contain transition-transform group-hover:scale-110" />
          <span className="text-base font-black tracking-tighter text-[hsl(var(--text-primary))]">
            Prova
          </span>
        </Link>

        {/* Desktop center links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[hsl(var(--text-secondary))] transition-colors hover:text-[hsl(var(--text-primary))]">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden items-center gap-5 md:flex">
          <span className="text-xs text-[hsl(var(--text-muted))]">Real yield, real simple</span>
          <div className="w-44">
            <WalletConnectButton />
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] text-[hsl(var(--text-secondary))] transition-colors hover:bg-[hsl(var(--bg-surface-alt))] md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`overflow-hidden border-b border-[hsl(var(--border-subtle))] bg-white transition-all duration-300 md:hidden ${menuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--text-secondary))] transition-colors hover:bg-[hsl(var(--bg-surface-alt))] hover:text-[hsl(var(--text-primary))]"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 pt-3 border-t border-[hsl(var(--border-subtle))]">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
