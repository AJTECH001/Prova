import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import type { PoolStake } from '../../../domain/pool/model/pool-stake.js';

export class MemoryPoolStakeRepository implements IPoolStakeRepository {
  private readonly store = new Map<string, PoolStake>();

  async findById(id: string): Promise<PoolStake | null> {
    return this.store.get(id) ?? null;
  }

  async findByPublicId(publicId: string): Promise<PoolStake | null> {
    for (const stake of this.store.values()) {
      if (stake.publicId === publicId) return stake;
    }
    return null;
  }

  async findByUserId(userId: string): Promise<PoolStake[]> {
    return [...this.store.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByPoolAddress(poolAddress: string): Promise<PoolStake[]> {
    return [...this.store.values()].filter((s) => s.poolAddress === poolAddress);
  }

  async save(stake: PoolStake): Promise<void> {
    this.store.set(stake.id, stake);
  }

  async update(stake: PoolStake): Promise<void> {
    this.store.set(stake.id, stake);
  }
}
