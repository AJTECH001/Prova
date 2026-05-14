'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { AdminService, type PlatformStats } from '@/services/AdminService';
import type { TransactionResponse } from '@/services/TransactionService';
import { TransactionList } from '@/components/features/transaction-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Extracted DevToolsDrawer and AdminPanel from dashboard.tsx
import { DevToolsDrawer, AdminPanel } from './dashboard'; // We will export these from dashboard

function StatCard({ label, value, sub, loading }: { label: string; value: string | number; sub?: string; loading?: boolean }) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-[var(--border-dark)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-medium text-[var(--text-muted)] leading-snug">{label}</p>
      {loading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-24" />
          {sub && <Skeleton className="h-4 w-16" />}
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
          {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
        </div>
      )}
    </div>
  );
}

export function AdminPage() {
  const role = useAuthStore((s) => s.role);
  
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsData, txData] = await Promise.all([
        AdminService.getStats(),
        AdminService.listEscrows({ limit: 50 }),
      ]);
      setStats(statsData);
      setTransactions(txData.items);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setStatsLoading(false);
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'ADMIN') {
      loadData();
    }
  }, [role, loadData]);

  if (role !== 'ADMIN') {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">You do not have permission to view this page.</p>
        <Button className="mt-4" asChild><Link href="/dashboard">Return to Dashboard</Link></Button>
      </div>
    );
  }

  const formatUsdc = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val).replace('$', '') + ' USDC';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Command Center</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Global platform statistics and controls.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard 
          label="Total Volume" 
          value={stats ? formatUsdc(stats.totalVolume) : '—'} 
          sub="All time settled" 
          loading={statsLoading} 
        />
        <StatCard 
          label="Active Escrows" 
          value={stats ? stats.activeEscrows : '—'} 
          sub="Pending / In Progress" 
          loading={statsLoading} 
        />
        <StatCard 
          label="Settled Escrows" 
          value={stats ? stats.settledEscrows : '—'} 
          sub="Funded / Redeemed" 
          loading={statsLoading} 
        />
      </div>

      {/* Global Transactions */}
      <div className="rounded-xl border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-dark)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Global Transactions</h2>
          <p className="text-sm text-[var(--text-muted)]">Recent escrows created across the entire platform.</p>
        </div>
        <div className="px-5 py-4">
          <TransactionList 
            transactions={transactions} 
            loading={txLoading} 
            hasMore={false} 
          />
        </div>
      </div>

      {/* Technical controls */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Platform Config</h3>
          <AdminPanel />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Developer State</h3>
          <DevToolsDrawer />
        </div>
      </div>
    </div>
  );
}
