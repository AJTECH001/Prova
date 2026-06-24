import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { parseEventLogs } from 'viem';
import { useTransactionStore } from '@/stores/transaction-store';
import { EscrowService } from '@/services/EscrowService';
import { TransactionDetail } from '@/components/features/transaction-detail';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { publicClient } from '@/lib/public-client';
import { ConfidentialEscrowABI, ADDRESSES } from '@/lib/contracts';

async function tryReconcileProcessing(txHash: string, publicId: string): Promise<boolean> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status === 'reverted') return false;
    const events = parseEventLogs({
      abi: ConfidentialEscrowABI,
      logs: receipt.logs.filter(
        (l) => l.address.toLowerCase() === ADDRESSES.ConfidentialEscrow.toLowerCase(),
      ),
      eventName: 'EscrowCreated',
    });
    if (events.length === 0) return false;
    const onChainId = events[0].args.escrowId.toString();
    await EscrowService.reportTransaction(txHash, publicId, onChainId);
    return true;
  } catch {
    return false;
  }
}

async function tryReconcileFunded(onChainId: string): Promise<boolean> {
  try {
    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest > 100000n ? latest - 100000n : 0n;
    const logs = await publicClient.getLogs({
      address: ADDRESSES.ConfidentialEscrow as `0x${string}`,
      event: {
        name: 'EscrowFunded',
        type: 'event',
        inputs: [
          { indexed: true, name: 'escrowId', type: 'uint256' },
          { indexed: true, name: 'payer',    type: 'address' },
        ],
      } as const,
      args: { escrowId: BigInt(onChainId) },
      fromBlock,
      toBlock: 'latest',
    });
    if (logs.length === 0) return false;
    await EscrowService.reportFunded(onChainId, logs[0].transactionHash!);
    return true;
  } catch {
    return false;
  }
}

export function TransactionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const currentTransaction = useTransactionStore((s) => s.currentTransaction);
  const loading = useTransactionStore((s) => s.loading);
  const fetchTransaction = useTransactionStore((s) => s.fetchTransaction);

  useEffect(() => {
    fetchTransaction(id);
  }, [id, fetchTransaction]);

  useEffect(() => {
    if (
      currentTransaction?.status === 'PROCESSING' &&
      currentTransaction.tx_hash &&
      !currentTransaction.on_chain_id
    ) {
      tryReconcileProcessing(currentTransaction.tx_hash, currentTransaction.public_id).then(
        (reconciled) => { if (reconciled) fetchTransaction(id); },
      );
    }
  }, [currentTransaction?.status, currentTransaction?.tx_hash, id, fetchTransaction]);

  useEffect(() => {
    if (currentTransaction?.status === 'ON_CHAIN' && currentTransaction.on_chain_id) {
      tryReconcileFunded(currentTransaction.on_chain_id).then(
        (reconciled) => { if (reconciled) fetchTransaction(id); },
      );
    }
  }, [currentTransaction?.status, currentTransaction?.on_chain_id, id, fetchTransaction]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/transactions')} className="shrink-0 -ml-1">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </Button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] sm:text-2xl">Payment Details</h1>
      </div>

      {loading && !currentTransaction ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : currentTransaction ? (
        <TransactionDetail transaction={currentTransaction} />
      ) : (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">Transaction not found</p>
      )}
    </div>
  );
}
