import { useEffect, useState } from 'react';
import { useTransactionStore } from '@/stores/transaction-store';
import { useWithdrawalStore } from '@/stores/withdrawal-store';
import { useWithdrawalFlow } from '@/hooks/use-withdrawal-flow';
import type { CreateWithdrawalRequest } from '@/services/WithdrawalService';
import { WithdrawalForm } from '@/components/features/withdrawal-form';
import { WithdrawalList } from '@/components/features/withdrawal-list';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { Button } from '@/components/ui/button';

export function WithdrawalsPage() {
  const transactions = useTransactionStore((s) => s.transactions);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const withdrawals = useWithdrawalStore((s) => s.withdrawals);
  const withdrawalLoading = useWithdrawalStore((s) => s.loading);
  const hasMore = useWithdrawalStore((s) => s.hasMore);
  const fetchWithdrawals = useWithdrawalStore((s) => s.fetchWithdrawals);

  const withdrawalFlow = useWithdrawalFlow();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTransactions(true);
    fetchWithdrawals(true);
  }, [fetchTransactions, fetchWithdrawals]);

  async function handleCreate(data: CreateWithdrawalRequest) {
    const publicId = await withdrawalFlow.execute(data);
    if (publicId) {
      setShowForm(false);
      fetchWithdrawals(true);
    }
  }

  function handleCancel() {
    setShowForm(false);
    withdrawalFlow.reset();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Withdrawals</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Redeem and bridge settled escrows</p>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
        >
          {showForm ? 'Cancel' : 'New Withdrawal'}
        </Button>
      </div>

      {/* Create form panel */}
      {showForm && (
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border-dark)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Create Withdrawal</h2>
            <p className="text-xs text-[var(--text-muted)]">Select settled escrows and destination chain</p>
          </div>
          <div className="px-5 py-5">
            {withdrawalFlow.currentStep < 0 ? (
              <WithdrawalForm transactions={transactions} onSubmit={handleCreate} />
            ) : (
              <div className="flex flex-col gap-4">
                <TransactionProgress steps={withdrawalFlow.steps} currentStep={withdrawalFlow.currentStep} />
                {withdrawalFlow.estimatedAmount && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-subtle)] bg-[hsl(var(--tip-bg))] px-4 py-3">
                    <svg className="h-4 w-4 text-[var(--status-success)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-[var(--status-success)]">
                      Estimated amount: <strong>{withdrawalFlow.estimatedAmount} USDC</strong>
                    </p>
                  </div>
                )}
                {withdrawalFlow.error && (
                  <div className="rounded-[var(--radius-subtle)] border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
                    <p className="text-sm text-[var(--status-error)]">{withdrawalFlow.error}</p>
                  </div>
                )}
                {withdrawalFlow.error && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={withdrawalFlow.reset}>Try Again</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawals table */}
      <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-dark)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">All Withdrawals</h2>
          <p className="text-xs text-[var(--text-muted)]">Bridge and redeem history</p>
        </div>
        <div className="px-5 py-4">
          <WithdrawalList
            withdrawals={withdrawals}
            loading={withdrawalLoading}
            hasMore={hasMore}
            onLoadMore={() => fetchWithdrawals()}
          />
        </div>
      </div>
    </div>
  );
}
