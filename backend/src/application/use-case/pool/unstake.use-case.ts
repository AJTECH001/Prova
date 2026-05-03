import { ApplicationHttpError } from '../../../core/errors.js';
import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import type { UnstakeResponse } from '../../dto/pool/pool-response.dto.js';

const UNSTAKE_ABI_SIG = 'unstake(uint256)';

export class UnstakeUseCase {
  constructor(private readonly poolStakeRepo: IPoolStakeRepository) {}

  async execute(stakePublicId: string, userId: string): Promise<UnstakeResponse> {
    const stake = await this.poolStakeRepo.findByPublicId(stakePublicId);

    if (!stake) {
      throw new ApplicationHttpError(404, 'Stake not found');
    }

    if (stake.userId !== userId) {
      throw new ApplicationHttpError(403, 'Unauthorized');
    }

    const unstakeable = [PoolStakeStatus.ACTIVE, PoolStakeStatus.PENDING, PoolStakeStatus.UNSTAKING];
    if (!unstakeable.includes(stake.status)) {
      throw new ApplicationHttpError(422, `Cannot unstake: stake status is ${stake.status}`);
    }

    if (stake.status !== PoolStakeStatus.UNSTAKING) {
      stake.markAsUnstaking();
      await this.poolStakeRepo.update(stake);
    }

    return {
      public_id: stake.publicId,
      call: {
        contract_address: stake.poolAddress,
        abi_function_signature: UNSTAKE_ABI_SIG,
        abi_parameters: {
          stake_id: stake.onChainStakeId ?? null,
        },
      },
    };
  }
}
