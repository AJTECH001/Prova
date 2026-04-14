import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTransactionStore } from '@/stores/transaction-store';
import { useEscrowFlow } from '@/hooks/use-escrow-flow';
import type { CreateTransactionRequest, TransactionResponse } from '@/services/TransactionService';
import { TransactionForm } from '@/components/features/transaction-form';
import { TransactionList } from '@/components/features/transaction-list';
import { TransactionProgress } from '@/components/features/transaction-progress';
import { Button } from '@/components/ui/button';

export function TransactionsPage() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const hasMore = useTransactionStore((s) => s.hasMore);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  const escrowFlow = useEscrowFlow();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  async function handleCreate(data: CreateTransactionRequest) {
    const publicId = await escrowFlow.execute(data);
    if (publicId) {
      setShowForm(false);
      fetchTransactions(true);
      navigate({ to: '/transactions/$id', params: { id: publicId } });
    }
  }

  function handleCancel() {
    setShowForm(false);
    escrowFlow.reset();
  }

  function handleSelect(transaction: TransactionResponse) {
    navigate({ to: '/transactions/$id', params: { id: transaction.public_id } });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Transactions</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Manage your escrow contracts</p>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
        >
          {showForm ? 'Cancel' : 'New Transaction'}
        </Button>
      </div>

      {/* Create form panel */}
      {showForm && (
        <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border-dark)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Create Escrow</h2>
            <p className="text-xs text-[var(--text-muted)]">Fill in the details to open a new on-chain escrow</p>
          </div>
          <div className="px-5 py-5">
            {escrowFlow.currentStep < 0 && !escrowFlow.inProgress ? (
              <TransactionForm onSubmit={handleCreate} />
            ) : (
              <div className="flex flex-col gap-4">
                <TransactionProgress steps={escrowFlow.steps} currentStep={escrowFlow.currentStep} />
                {escrowFlow.inProgress && !escrowFlow.error && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-subtle)] bg-[var(--accent-blue-bg)] px-4 py-3">
                    <svg className="h-4 w-4 animate-spin text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-[var(--accent-blue)]">Processing on-chain… please wait</p>
                  </div>
                )}
                {escrowFlow.error && (
                  <div className="rounded-[var(--radius-subtle)] border border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))] px-4 py-3">
                    <p className="text-sm text-[var(--status-error)]">{escrowFlow.error}</p>
                  </div>
                )}
                {escrowFlow.error && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={escrowFlow.reset}>Try Again</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="rounded-[var(--radius-block)] border border-[var(--border-dark)] bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-dark)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">All Transactions</h2>
          <p className="text-xs text-[var(--text-muted)]">Click a row to view full details</p>
        </div>
        <div className="px-5 py-4">
          <TransactionList
            transactions={transactions}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={() => fetchTransactions()}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}
