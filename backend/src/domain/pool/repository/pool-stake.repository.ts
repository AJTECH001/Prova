import type { PoolStake } from '../model/pool-stake.js';

export interface IPoolStakeRepository {
  findById(id: string): Promise<PoolStake | null>;
  findByPublicId(publicId: string): Promise<PoolStake | null>;
  findByUserId(userId: string): Promise<PoolStake[]>;
  findByPoolAddress(poolAddress: string): Promise<PoolStake[]>;
  save(stake: PoolStake): Promise<void>;
  update(stake: PoolStake): Promise<void>;
}
