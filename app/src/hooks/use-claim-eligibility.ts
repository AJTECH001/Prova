import { DEFAULT_WAITING_PERIOD_MS } from '@/lib/contracts';
import type { TransactionResponse } from '@/services/TransactionService';

const TERMINAL_STATUSES = new Set(['SETTLED', 'REDEEMED', 'COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED', 'EXPIRED']);

/**
 * Returns true when the on-chain condition is met for a seller to initiate a claim.
 * Mirrors ProvaPaymentResolver.isConditionMet:
 *   block.timestamp >= dueDate + DEFAULT_WAITING_PERIOD
 */
export function isClaimEligible(transaction: TransactionResponse): boolean {
  if (!transaction.on_chain_escrow_id) return false;
  if (TERMINAL_STATUSES.has(transaction.status)) return false;
  const claimOpenAt = new Date(transaction.deadline).getTime() + DEFAULT_WAITING_PERIOD_MS;
  return Date.now() >= claimOpenAt;
}

/** Returns the timestamp (ms) when the claim window opens for an escrow. */
export function claimOpenAt(deadline: string): number {
  return new Date(deadline).getTime() + DEFAULT_WAITING_PERIOD_MS;
}
