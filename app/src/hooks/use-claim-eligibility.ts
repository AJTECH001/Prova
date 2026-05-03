import { MIN_WAITING_PERIOD_MS } from '@/lib/contracts';
import type { TransactionResponse } from '@/services/TransactionService';

const TERMINAL_STATUSES = new Set(['SETTLED', 'REDEEMED', 'COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED', 'EXPIRED']);

/**
 * Returns true when the on-chain condition is met for a seller to initiate a claim.
 * Mirrors TradeInvoiceResolver.isConditionMet:
 *   block.timestamp >= dueDate + waitingPeriod
 * Uses MIN_WAITING_PERIOD as the conservative estimate when per-escrow period is unknown.
 */
export function isClaimEligible(transaction: TransactionResponse): boolean {
  if (!transaction.on_chain_id) return false;
  if (TERMINAL_STATUSES.has(transaction.status)) return false;
  const claimOpenAt = new Date(transaction.deadline).getTime() + MIN_WAITING_PERIOD_MS;
  return Date.now() >= claimOpenAt;
}

/** Returns the timestamp (ms) when the claim window opens for an escrow. */
export function claimOpenAt(deadline: string): number {
  return new Date(deadline).getTime() + MIN_WAITING_PERIOD_MS;
}
