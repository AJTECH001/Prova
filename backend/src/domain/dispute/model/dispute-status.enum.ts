// Mirrors the `dispute_status` pg enum in infrastructure/repository/postgres/schema.ts.
export enum DisputeStatus {
  /** Recorded but not yet formally filed (reserved for draft flows). */
  PENDING = 'PENDING',
  /** Filed by the seller — awaiting on-chain judgment / settlement. */
  FILED = 'FILED',
  /** Judged valid — payout path (escrow redeem) may proceed. */
  ACCEPTED = 'ACCEPTED',
  /** Judged invalid / disputed debt — no payout. */
  REJECTED = 'REJECTED',
}
