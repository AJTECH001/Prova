import { randomUUID } from 'crypto';
import { getEnv } from '../../../core/config.js';
import type { IPoolStakeRepository } from '../../../domain/pool/repository/pool-stake.repository.js';
import { PoolStake } from '../../../domain/pool/model/pool-stake.js';
import { PoolStakeStatus } from '../../../domain/pool/model/pool-stake-status.enum.js';
import type { StakeDto } from '../../dto/pool/stake.dto.js';
import type { StakeResponse } from '../../dto/pool/pool-response.dto.js';

const USDC_DECIMALS = 6;

export class StakeUseCase {
  constructor(private readonly poolStakeRepo: IPoolStakeRepository) {}

  async execute(dto: StakeDto, userId: string): Promise<StakeResponse> {
    const env = getEnv();
    const poolAddress = dto.pool_address ?? env.POOL_ADDRESS ?? '';

    const stake = new PoolStake({
      id: randomUUID(),
      publicId: randomUUID(),
      userId,
      poolAddress,
      amount: dto.amount,
      status: PoolStakeStatus.PENDING,
      createdAt: new Date(),
    });

    await this.poolStakeRepo.save(stake);

    const amountInSmallestUnit = BigInt(Math.round(dto.amount * 10 ** USDC_DECIMALS));

    return {
      public_id: stake.publicId,
      pool_address: poolAddress,
      amount: dto.amount,
      amount_smallest_unit: amountInSmallestUnit.toString(),
    };
  }
}
