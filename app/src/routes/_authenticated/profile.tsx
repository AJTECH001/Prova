import { useEffect, useState } from 'react';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { UserService, type UserProfile } from '@/services/UserService';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const ROLE_LABELS: Record<UserRole, string> = {
  SELLER: 'Seller',
  BUYER: 'Buyer',
  LP: 'Liquidity Provider',
};

const CHANGEABLE_ROLES: UserRole[] = ['SELLER', 'BUYER', 'LP'];

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-border-default)] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--color-text-tertiary)]">{label}</p>
      <p className={`text-sm font-medium text-[var(--color-text-primary)] ${mono ? 'break-all font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export function ProfilePage() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletProvider = useAuthStore((s) => s.walletProvider);
  const currentRole = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    UserService.getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleSave() {
    if (!selectedRole) return;
    setRoleLoading(true);
    setRoleError(null);
    try {
      await UserService.setRole(selectedRole);
      setRole(selectedRole);
      setEditingRole(false);
      setSelectedRole(null);
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const initials = walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '??';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">Profile</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)]">Your account and wallet details</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-default)] px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-subtle)] sm:h-14 sm:w-14">
              <span className="text-lg font-bold text-[var(--color-brand-primary)] sm:text-xl">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Account ••••{walletAddress ? walletAddress.slice(-4).toUpperCase() : '??'}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success)]" />
                <span className="text-xs capitalize text-[var(--color-text-tertiary)]">{walletProvider ?? 'Connected'}</span>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            <InfoRow label="Full wallet address" value={user?.wallet_address ?? walletAddress} mono />
            <InfoRow label="Wallet provider" value={user?.wallet_provider ?? walletProvider} />
            {user?.email && <InfoRow label="Email" value={user.email} />}
            {user?.created_at && <InfoRow label="Member since" value={formatDate(user.created_at)} />}

            {/* Role row */}
            <div className="flex flex-col gap-3 border-b border-[var(--color-border-default)] py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm text-[var(--color-text-tertiary)]">Role</p>
              {!editingRole ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {currentRole ? ROLE_LABELS[currentRole] : '—'}
                  </p>
                  <button
                    onClick={() => { setEditingRole(true); setSelectedRole(currentRole); }}
                    className="text-xs text-[var(--color-brand-primary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {CHANGEABLE_ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRole(r)}
                        className={[
                          'rounded-[var(--radius-button)] border px-3 py-1.5 text-xs font-medium transition-all',
                          selectedRole === r
                            ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)]'
                            : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)]',
                        ].join(' ')}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  {roleError && <p className="text-xs text-[var(--color-error)]">{roleError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" loading={roleLoading} disabled={!selectedRole || selectedRole === currentRole} onClick={handleRoleSave}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setEditingRole(false); setRoleError(null); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border-default)] px-4 py-3.5 sm:px-6 sm:py-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Network</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">Active chain information</p>
        </div>
        <div className="px-4 sm:px-6">
          <InfoRow label="Chain" value="Arbitrum Sepolia" />
          <InfoRow label="Chain ID" value="421614" />
          <InfoRow label="Currency" value="USDC (pUSDC)" />
        </div>
      </div>
    </div>
  );
}
