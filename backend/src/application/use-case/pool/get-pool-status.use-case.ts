import { getEnv } from '../../../core/config.js';
import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import type { PoolStatusResponse } from '../../dto/pool/pool-response.dto.js';

export class GetPoolStatusUseCase {
  constructor(private readonly poolStakeRepo: IPoolStakeRepository) {}

  async execute(): Promise<PoolStatusResponse> {
    const env = getEnv();
    const poolAddress = env.POOL_ADDRESS ?? '';
    const policyAddress = env.POLICY_ADDRESS ?? '';

    const allStakes = await this.poolStakeRepo.findByPoolAddress(poolAddress);
    const activeStakes = allStakes.filter((s) => s.status === PoolStakeStatus.ACTIVE);

    const totalStaked = activeStakes.reduce((sum, s) => sum + s.amount, 0);

    return {
      pool_address: poolAddress,
      policy_address: policyAddress,
      total_staked: totalStaked.toFixed(2),
      premiums_earned: '0.00',
      active_stakers: activeStakes.length,
      chain_id: env.CHAIN_ID,
    };
  }
}
