import { useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';

// ── Icons ──────────────────────────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
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

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
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

// ── Nav config ─────────────────────────────────────────────────────────────
const navSections = [
  {
    label: 'Overview',
    links: [
      { name: 'Dashboard', to: '/dashboard' as const, icon: HomeIcon },
    ],
  },
  {
    label: 'Payments',
    links: [
      { name: 'Transactions', to: '/transactions' as const, icon: ArrowsIcon },
      { name: 'Withdrawals', to: '/withdrawals' as const, icon: UploadIcon },
    ],
  },
  {
    label: 'Account',
    links: [
      { name: 'Profile', to: '/profile' as const, icon: UserIcon },
    ],
  },
];

// ── Sidebar content ────────────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { logout } = useAuth();

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  async function handleLogout() {
    await logout();
    navigate({ to: '/' });
  }

  const truncated = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  return (
    <div className="flex h-full flex-col">
      {/* Logo row */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--border-dark)]">
        <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-subtle)] bg-[var(--accent-blue)]">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">Prova</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[hsl(var(--bg-hover))] hover:text-[var(--text-primary)] transition-colors lg:hidden"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const active = isActive(link.to);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={onClose}
                      className={[
                        'flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-all',
                        active
                          ? 'bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]'
                          : 'text-[var(--text-secondary)] hover:bg-[hsl(var(--bg-hover))] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      <span className={active ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}>
                        <link.icon />
                      </span>
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom — wallet + logout */}
      <div className="border-t border-[var(--border-dark)] p-3 space-y-1">
        {walletAddress && (
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2 transition-colors hover:bg-[hsl(var(--bg-hover))]"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue-bg)]">
              <span className="text-[10px] font-bold text-[var(--accent-blue)]">
                {walletAddress.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-[var(--text-secondary)]">{truncated}</p>
              <p className="text-[11px] text-[var(--text-muted)]">View profile</p>
            </div>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[hsl(var(--danger-bg))] hover:text-[var(--status-error)] cursor-pointer"
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Exported component ─────────────────────────────────────────────────────
export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--border-dark)] bg-white px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[hsl(var(--bg-hover))] transition-colors"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-minimal)] bg-[var(--accent-blue)]">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Prova</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border-dark)] lg:bg-white lg:h-screen lg:sticky lg:top-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-[var(--shadow-xl)] lg:hidden">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
