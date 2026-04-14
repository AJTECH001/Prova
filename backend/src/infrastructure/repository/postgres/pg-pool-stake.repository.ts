import { eq } from 'drizzle-orm';
import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStake } from '../../../domain/pool/model/pool-stake.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import { poolStakes } from './schema.js';
import type { Db } from './db.js';

type PoolStakeRow = typeof poolStakes.$inferSelect;

export class PgPoolStakeRepository implements IPoolStakeRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<PoolStake | null> {
    const row = await this.db.query.poolStakes.findFirst({ where: eq(poolStakes.id, id) });
    return row ? this.toDomain(row) : null;
  }

  async findByPublicId(publicId: string): Promise<PoolStake | null> {
    const row = await this.db.query.poolStakes.findFirst({
      where: eq(poolStakes.publicId, publicId),
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<PoolStake[]> {
    const rows = await this.db.select().from(poolStakes).where(eq(poolStakes.userId, userId));
    return rows.map((r) => this.toDomain(r));
  }

  async findByPoolAddress(poolAddress: string): Promise<PoolStake[]> {
    const rows = await this.db
      .select()
      .from(poolStakes)
      .where(eq(poolStakes.poolAddress, poolAddress));
    return rows.map((r) => this.toDomain(r));
  }

  async save(stake: PoolStake): Promise<void> {
    await this.db.insert(poolStakes).values({
      id: stake.id,
      publicId: stake.publicId,
      userId: stake.userId,
      poolAddress: stake.poolAddress,
      amount: stake.amount.toString(),
      status: stake.status,
      txHash: stake.txHash ?? null,
      createdAt: stake.createdAt,
      withdrawnAt: stake.withdrawnAt ?? null,
    });
  }

  async update(stake: PoolStake): Promise<void> {
    await this.db
      .update(poolStakes)
      .set({
        status: stake.status,
        txHash: stake.txHash ?? null,
        withdrawnAt: stake.withdrawnAt ?? null,
      })
      .where(eq(poolStakes.id, stake.id));
  }

  private toDomain(row: PoolStakeRow): PoolStake {
    return new PoolStake({
      id: row.id,
      publicId: row.publicId,
      userId: row.userId,
      poolAddress: row.poolAddress,
      amount: parseFloat(row.amount),
      status: row.status as PoolStakeStatus,
      txHash: row.txHash ?? undefined,
      createdAt: row.createdAt,
      withdrawnAt: row.withdrawnAt ?? undefined,
    });
  }
}
