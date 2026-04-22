import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { UserService } from '@/services/UserService';
import { Button } from '@/components/ui/button';

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'SELLER',
    title: 'Seller',
    description: 'I sell goods or services on credit and want to protect my invoices against non-payment.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    role: 'BUYER',
    title: 'Buyer',
    description: 'I purchase goods or services on credit and fund escrows to settle invoices.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
        <path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
    ),
  },
  {
    role: 'LP',
    title: 'Liquidity Provider',
    description: 'I want to deposit USDC into the insurance pool and earn yield from premiums.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const setRole = useAuthStore((s) => s.setRole);
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await UserService.setRole(selected);
      setRole(selected);
      const destination = selected === 'LP' ? '/pool' : '/dashboard';
      navigate({ to: destination });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save role. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--bg-base))] px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-subtle)] bg-[var(--accent-blue)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Welcome to Prova</h1>
          <p className="mt-2 text-[var(--text-secondary)]">How will you use Prova? Pick the role that fits best.</p>
        </div>

        {/* Role cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selected === option.role;
            return (
              <button
                key={option.role}
                onClick={() => setSelected(option.role)}
                className={[
                  'flex flex-col gap-4 rounded-[var(--radius-block)] border-2 p-6 text-left transition-all',
                  isSelected
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-bg)] shadow-md'
                    : 'border-[var(--border-dark)] bg-white hover:border-[var(--accent-blue)] hover:shadow-sm',
                ].join(' ')}
              >
                <span className={isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-muted)]'}>
                  {option.icon}
                </span>
                <div>
                  <p className={`font-semibold ${isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]'}`}>
                    {option.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{option.description}</p>
                </div>
                {isSelected && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--accent-blue)] px-2 py-0.5 text-xs font-semibold text-white">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--radius-subtle)] border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
            <p className="text-sm text-[var(--status-error)]">{error}</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            size="sm"
            disabled={!selected || loading}
            loading={loading}
            onClick={handleConfirm}
            className="px-10"
          >
            Continue
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          You can change your role later in Profile settings.
        </p>
      </div>
    </div>
  );
}
