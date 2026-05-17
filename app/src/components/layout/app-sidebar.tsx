'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';

// ── Icons ──────────────────────────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function BalanceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function PoolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.293 11.293a1 1 0 001.414-1.414L9.414 11H17a1 1 0 100-2H9.414l2.293-2.293a1 1 0 00-1.414-1.414l-4 4a1 1 0 000 1.414l4 4z" clipRule="evenodd" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

// ── Role labels ─────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  SELLER: 'Merchant',
  BUYER: 'Customer',
  LP: 'Liquidity Provider',
};

const ROLE_COLOR: Record<string, string> = {
  SELLER: 'bg-[hsl(var(--bg-active))] text-[var(--accent-blue)]',
  BUYER: 'bg-[hsl(var(--tip-bg))] text-[var(--status-success)]',
  LP: 'bg-[hsl(var(--brand-purple-light))] text-[hsl(var(--brand-purple))]',
};

// ── Nav config per role ─────────────────────────────────────────────────────
type NavLink = { name: string; href: string; icon: () => React.ReactElement };
type NavSection = { label: string; links: NavLink[] };

function getNavSections(role: UserRole | null): NavSection[] {
  const overview: NavSection = {
    label: 'Overview',
    links: [{ name: 'Dashboard', href: '/dashboard', icon: HomeIcon }],
  };
  const sellerMoney: NavSection = {
    label: 'Payments',
    links: [
      { name: 'Balances', href: '/balances', icon: BalanceIcon },
      { name: 'Transactions', href: '/transactions', icon: ArrowsIcon },
      { name: 'Withdrawals', href: '/withdrawals', icon: UploadIcon },
      { name: 'Disputes', href: '/disputes', icon: DisputeIcon },
    ],
  };
  const buyerMoney: NavSection = {
    label: 'Payments',
    links: [
      { name: 'Transactions', href: '/transactions', icon: ArrowsIcon },
    ],
  };
  const earn: NavSection = {
    label: 'Earn',
    links: [{ name: 'Pool', href: '/pool', icon: PoolIcon }],
  };
  const account: NavSection = {
    label: 'Account',
    links: [{ name: 'Profile', href: '/profile', icon: UserIcon }],
  };

  if (role === 'SELLER') return [overview, sellerMoney, account];
  if (role === 'BUYER')  return [overview, buyerMoney, account];
  if (role === 'LP')     return [overview, earn, account];
  return [account];
}

// ── Sidebar content ────────────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const role = useAuthStore((s) => s.role);
  const navSections = getNavSections(role);
  const { logout } = useAuth();

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + '/');
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  const accountId = walletAddress ? `••••${walletAddress.slice(-4).toUpperCase()}` : '';
  const roleLabel = role ? ROLE_LABEL[role] : null;
  const roleColorClass = role
    ? (ROLE_COLOR[role] ?? 'bg-[hsl(var(--bg-surface-alt))] text-[var(--text-muted)]')
    : '';

  return (
    <div className="flex h-full flex-col">
      {/* Logo row */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border-dark)] px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <Image src="/prova_logo.png" alt="Prova" width={26} height={26} className="rounded-sm" />
          <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">Prova</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[hsl(var(--bg-hover))] hover:text-[var(--text-primary)] lg:hidden"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className={[
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
                        active
                          ? 'bg-[hsl(var(--bg-active))] text-[var(--accent-blue)]'
                          : 'text-[var(--text-muted)] hover:bg-[hsl(var(--bg-hover))] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      <span
                        className={`shrink-0 transition-colors ${active ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}`}
                      >
                        <link.icon />
                      </span>
                      {link.name}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-blue)] opacity-80" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom — account + logout */}
      <div className="space-y-1 border-t border-[var(--border-dark)] p-3">
        {walletAddress && (
          <Link
            href="/profile"
            onClick={onClose}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-[hsl(var(--bg-hover))]"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue-bg)]">
              <span className="text-[10px] font-bold text-[var(--accent-blue)]">
                {walletAddress.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                Account <span className="font-mono">{accountId}</span>
              </p>
              {roleLabel && (
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold ${roleColorClass}`}
                >
                  {roleLabel}
                </span>
              )}
            </div>
            <svg
              width="12" height="12" viewBox="0 0 20 20" fill="currentColor"
              className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[hsl(var(--danger-bg))] hover:text-[var(--status-error)]"
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Mobile top-bar account chip ────────────────────────────────────────────
function MobileTopBarAccount() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  if (!walletAddress) return null;
  return (
    <span className="rounded-full bg-[hsl(var(--bg-surface-alt))] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
      ••••{walletAddress.slice(-4).toUpperCase()}
    </span>
  );
}

// ── Exported component ─────────────────────────────────────────────────────
export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-dark)] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[hsl(var(--bg-hover))]"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/prova_logo.png" alt="Prova" width={22} height={22} className="rounded-sm" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Prova</span>
          </div>
        </div>
        <MobileTopBarAccount />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:h-screen lg:w-56 lg:shrink-0 lg:sticky lg:top-0 lg:flex-col lg:border-r lg:border-[var(--border-dark)] lg:bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl lg:hidden"
            style={{ animation: 'slideInLeft 200ms ease-out' }}
          >
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
