import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { UserService, type UserProfile } from '@/services/UserService';
import { Skeleton } from '@/components/ui/skeleton';

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border-dark)] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm font-medium text-[var(--text-primary)] ${mono ? 'break-all font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export function ProfilePage() {
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const walletProvider = useAuthStore((s) => s.walletProvider);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    UserService.getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const initials = walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '??';

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Profile</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Your account and wallet details</p>
      </div>

      {loading ? (
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
          {/* Avatar header */}
          <div className="flex items-center gap-4 border-b border-[var(--border-dark)] px-6 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue-bg)]">
              <span className="text-xl font-bold text-[var(--accent-blue)]">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : '—'}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
                <span className="text-xs capitalize text-[var(--text-muted)]">
                  {walletProvider ?? 'Connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="px-6">
            <InfoRow
              label="Full wallet address"
              value={user?.wallet_address ?? walletAddress}
              mono
            />
            <InfoRow
              label="Wallet provider"
              value={user?.wallet_provider ?? walletProvider}
            />
            {user?.email && <InfoRow label="Email" value={user.email} />}
            {user?.created_at && (
              <InfoRow label="Member since" value={formatDate(user.created_at)} />
            )}
          </div>
        </div>
      )}

      {/* Network info */}
      <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-dark)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Network</h2>
          <p className="text-xs text-[var(--text-muted)]">Active chain information</p>
        </div>
        <div className="px-6">
          <InfoRow label="Chain" value="Arbitrum Sepolia" />
          <InfoRow label="Chain ID" value="421614" />
          <InfoRow label="Currency" value="USDC (pUSDC)" />
        </div>
      </div>
    </div>
  );
}
