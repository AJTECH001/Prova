'use client'

import { useState } from 'react'
import Link from 'next/link'

type NavLink = { label: string; href: string }

const NAV_LINKS: NavLink[] = [
  { label: 'Features',     href: '/#features' },
  { label: 'How it works', href: '/#demo' },
  { label: 'Pricing',      href: '/pricing' },
  { label: 'Blog',         href: '/blog' },
]

export function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[hsl(var(--ds-line-light))] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <img src="/prova_logo.png" alt="Prova" className="h-7 w-7 rounded-md object-contain transition-transform group-hover:scale-110" />
          <span className="text-base font-black tracking-tighter text-[hsl(var(--ds-ink-900))]">Prova</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[hsl(var(--ds-ink-600))] transition-colors hover:text-[hsl(var(--ds-ink-900))]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth"
            className="rounded-full border border-[hsl(var(--ds-line-strong))] px-5 py-2 text-sm font-semibold text-[hsl(var(--ds-ink-900))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)] hover:text-[hsl(var(--ds-teal-600))]"
          >
            Sign in
          </Link>
          <Link
            href="/auth"
            className="rounded-full bg-[hsl(var(--ds-teal-600))] px-5 py-2 text-sm font-bold text-[hsl(var(--ds-surface-white))] shadow-sm transition-colors hover:bg-[hsl(var(--ds-teal-700))]"
          >
            Get started
          </Link>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--ds-line-light))] text-[hsl(var(--ds-ink-600))] transition-colors hover:bg-[hsl(var(--ds-surface-section))] md:hidden"
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

      <div className={`overflow-hidden border-b border-[hsl(var(--ds-line-light))] bg-white transition-all duration-300 md:hidden ${menuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--ds-ink-600))] transition-colors hover:bg-[hsl(var(--ds-surface-section))] hover:text-[hsl(var(--ds-ink-900))]"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-[hsl(var(--ds-line-light))] pt-3">
            <Link
              href="/auth"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl border border-[hsl(var(--ds-line-strong))] px-4 py-2.5 text-center text-sm font-semibold text-[hsl(var(--ds-ink-900))] transition-colors hover:border-[hsl(var(--ds-teal-600)/0.4)]"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-[hsl(var(--ds-teal-600))] px-4 py-2.5 text-center text-sm font-bold text-[hsl(var(--ds-surface-white))] transition-colors hover:bg-[hsl(var(--ds-teal-700))]"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
