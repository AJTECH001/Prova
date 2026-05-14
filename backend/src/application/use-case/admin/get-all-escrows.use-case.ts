import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { PaginatedEscrowsResponse } from '../../dto/escrow/escrow-response.dto.js';
import { toEscrowResponse } from '../escrow/get-escrows.use-case.js';

const DEFAULT_LIMIT = 50;

export class GetAllEscrowsUseCase {
  constructor(private readonly escrowRepository: IEscrowRepository) {}

  async execute(options?: { limit?: number; cursor?: string; status?: string }): Promise<PaginatedEscrowsResponse> {
    const limit = options?.limit ?? DEFAULT_LIMIT;

    const result = await this.escrowRepository.findAll({
      limit: limit + 1,
      cursor: options?.cursor,
      status: options?.status as any,
    });

    const hasMore = result.items.length > limit;
    const items = hasMore ? result.items.slice(0, limit) : result.items;

    return {
      items: items.map(toEscrowResponse),
      continuation_token: hasMore ? result.cursor : undefined,
      has_more: hasMore,
      limit,
    };
  }
}
