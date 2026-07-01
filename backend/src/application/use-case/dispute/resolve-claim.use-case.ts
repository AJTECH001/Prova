import type { IDisputeRepository } from '../../../domain/dispute/repository/dispute.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toClaimResponse, type ClaimResponse } from '../../dto/dispute/dispute-response.dto.js';
import type { ResolveClaimDto } from '../../dto/dispute/file-claim.dto.js';

/**
 * Records the resolution of a filed claim (ACCEPTED / REJECTED) after the on-chain
 * judgment is known. Intended to be driven by the coverage/claim webhook processor or
 * an admin operator once `TradeCreditInsurancePolicy.judge` has been executed by the
 * coverage manager. Not yet exposed as a public HTTP endpoint — the `UserRole` enum has
 * no admin/underwriter role (see ACTION_ITEMS P0 "widen roles + enforce RBAC").
 */
export class ResolveClaimUseCase {
  constructor(private readonly disputeRepository: IDisputeRepository) {}

  async execute(publicId: string, dto: ResolveClaimDto): Promise<ClaimResponse> {
    const dispute = await this.disputeRepository.findByPublicId(publicId);
    if (!dispute) throw ApplicationHttpError.notFound('Claim not found');
    if (dispute.isTerminal()) {
      throw ApplicationHttpError.conflict(`Claim already resolved (status: ${dispute.status})`);
    }

    if (dto.accepted) {
      dispute.markAccepted(dto.tx_hash);
    } else {
      dispute.markRejected(dto.reason ?? 'Claim rejected');
    }

    await this.disputeRepository.update(dispute);
    return toClaimResponse(dispute);
  }
}
