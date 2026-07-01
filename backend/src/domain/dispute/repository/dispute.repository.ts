import type { Dispute } from '../model/dispute.js';
import type { DisputeStatus } from '../model/dispute-status.enum.js';

export interface FindDisputesByUserIdOptions {
  limit?: number;
  cursor?: string;
  status?: DisputeStatus;
}

export interface PaginatedResult<T> {
  items: T[];
  cursor?: string;
}

export interface IDisputeRepository {
  findById(id: string): Promise<Dispute | null>;
  findByPublicId(publicId: string): Promise<Dispute | null>;
  findByUserId(userId: string, options?: FindDisputesByUserIdOptions): Promise<PaginatedResult<Dispute>>;
  /** Returns an open (FILED/PENDING) claim for the escrow, if any — used to prevent duplicates. */
  findOpenByEscrowId(escrowId: string): Promise<Dispute | null>;
  save(dispute: Dispute): Promise<void>;
  update(dispute: Dispute): Promise<void>;
}
