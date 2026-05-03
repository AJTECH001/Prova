import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import { ApplicationHttpError } from '../../../core/errors.js';

export class ConfirmUnstakeUseCase {
  constructor(private readonly poolStakeRepo: IPoolStakeRepository) {}

  async execute(publicId: string, userId: string): Promise<void> {
    const stake = await this.poolStakeRepo.findByPublicId(publicId);

    if (!stake) throw new ApplicationHttpError(404, 'Stake not found');
    if (stake.userId !== userId) throw new ApplicationHttpError(403, 'Forbidden');
    if (stake.status === PoolStakeStatus.WITHDRAWN) return; // idempotent

    stake.markAsWithdrawn();
    await this.poolStakeRepo.update(stake);
  }
}
