import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import { ApplicationHttpError } from '../../../core/errors.js';

export class ConfirmStakeUseCase {
  constructor(private readonly poolStakeRepo: IPoolStakeRepository) {}

  async execute(publicId: string, userId: string, txHash?: string, onChainStakeId?: string): Promise<void> {
    const stake = await this.poolStakeRepo.findByPublicId(publicId);

    if (!stake) throw new ApplicationHttpError(404, 'Stake not found');
    if (stake.userId !== userId) throw new ApplicationHttpError(403, 'Forbidden');

    if (txHash) stake.txHash = txHash;
    if (onChainStakeId) stake.onChainStakeId = onChainStakeId;

    if (stake.status === PoolStakeStatus.ACTIVE) {
      await this.poolStakeRepo.update(stake); // persist stakeId even if already active
      return;
    }

    stake.markAsActive();
    await this.poolStakeRepo.update(stake);
  }
}
