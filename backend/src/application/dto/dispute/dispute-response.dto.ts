import type { Dispute } from '../../../domain/dispute/model/dispute.js';

export interface ClaimResponse {
  public_id: string;
  escrow_id: string;
  coverage_id: string;
  status: string;
  tx_hash?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedClaimsResponse {
  items: ClaimResponse[];
  continuation_token?: string;
}

export function toClaimResponse(d: Dispute): ClaimResponse {
  return {
    public_id: d.publicId,
    escrow_id: d.escrowId,
    coverage_id: d.coverageId,
    status: d.status,
    tx_hash: d.txHash,
    error_message: d.errorMessage,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}
