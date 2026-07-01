import type { IDisputeRepository } from '../../../domain/dispute/repository/dispute.repository.js';
import { ApplicationHttpError } from '../../../core/errors.js';
import { toClaimResponse, type ClaimResponse } from '../../dto/dispute/dispute-response.dto.js';

export class GetClaimUseCase {
  constructor(private readonly disputeRepository: IDisputeRepository) {}

  async execute(publicId: string, requestingUserId: string): Promise<ClaimResponse> {
    const dispute = await this.disputeRepository.findByPublicId(publicId);
    if (!dispute) throw ApplicationHttpError.notFound('Claim not found');
    if (dispute.userId !== requestingUserId) throw ApplicationHttpError.forbidden('Unauthorized');
    return toClaimResponse(dispute);
  }
}
