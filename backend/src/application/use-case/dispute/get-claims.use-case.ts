import type { IDisputeRepository } from '../../../domain/dispute/repository/dispute.repository.js';
import type { DisputeStatus } from '../../../domain/dispute/model/dispute-status.enum.js';
import { toClaimResponse, type PaginatedClaimsResponse } from '../../dto/dispute/dispute-response.dto.js';

export interface GetClaimsOptions {
  limit?: number;
  cursor?: string;
  status?: string;
}

export class GetClaimsUseCase {
  constructor(private readonly disputeRepository: IDisputeRepository) {}

  async execute(userId: string, options?: GetClaimsOptions): Promise<PaginatedClaimsResponse> {
    const result = await this.disputeRepository.findByUserId(userId, {
      limit: options?.limit,
      cursor: options?.cursor,
      status: options?.status as DisputeStatus | undefined,
    });

    return {
      items: result.items.map(toClaimResponse),
      continuation_token: result.cursor,
    };
  }
}
