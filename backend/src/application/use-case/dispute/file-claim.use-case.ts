import { randomUUID } from 'crypto';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { IDisputeRepository } from '../../../domain/dispute/repository/dispute.repository.js';
import { Dispute } from '../../../domain/dispute/model/dispute.js';
import { DisputeStatus } from '../../../domain/dispute/model/dispute-status.enum.js';
import { EscrowStatus } from '../../../domain/escrow/model/escrow-status.enum.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toClaimResponse, type ClaimResponse } from '../../dto/dispute/dispute-response.dto.js';
import type { FileClaimDto } from '../../dto/dispute/file-claim.dto.js';

function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'CLM-';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Files a trade-credit claim against a covered escrow whose buyer has not paid.
 * Records the claim in the (previously orphaned) `disputes` store as FILED. The
 * on-chain settlement/judgment is a separate protocol step (see resolve-claim).
 */
export class FileClaimUseCase {
  constructor(
    private readonly escrowRepository: IEscrowRepository,
    private readonly disputeRepository: IDisputeRepository,
  ) {}

  async execute(dto: FileClaimDto, userId: string, walletAddress: string): Promise<ClaimResponse> {
    const escrow = await this.escrowRepository.findByPublicId(dto.escrow_public_id);
    if (!escrow) throw ApplicationHttpError.notFound('Escrow not found');
    if (escrow.userId !== userId) throw ApplicationHttpError.forbidden('Escrow does not belong to user');

    if (!escrow.onChainEscrowId) {
      throw ApplicationHttpError.badRequest('Escrow is not yet on-chain');
    }
    if (!escrow.coverageId) {
      throw ApplicationHttpError.badRequest('Escrow has no coverage — nothing to claim');
    }

    // A claim only makes sense while the escrow is live (not already settled/redeemed/closed).
    const nonClaimable = [
      EscrowStatus.SETTLED,
      EscrowStatus.REDEEMED,
      EscrowStatus.CANCELED,
      EscrowStatus.EXPIRED,
      EscrowStatus.FAILED,
    ];
    if (nonClaimable.includes(escrow.status)) {
      throw ApplicationHttpError.badRequest(`Escrow is not claimable (status: ${escrow.status})`);
    }

    const existing = await this.disputeRepository.findOpenByEscrowId(escrow.id);
    if (existing) {
      throw ApplicationHttpError.conflict('An open claim already exists for this escrow');
    }

    const now = new Date();
    const dispute = new Dispute({
      id: randomUUID(),
      publicId: generatePublicId(),
      escrowId: escrow.id,
      coverageId: escrow.coverageId,
      userId,
      walletId: walletAddress,
      status: DisputeStatus.FILED,
      disputeProof: dto.dispute_proof,
      createdAt: now,
      updatedAt: now,
    });

    await this.disputeRepository.save(dispute);
    return toClaimResponse(dispute);
  }
}
