import { PoolStakeStatus } from './pool-stake-status.enum.js';

export interface PoolStakeParams {
  id: string;
  publicId: string;
  userId: string;
  poolAddress: string;
  amount: number;
  status: PoolStakeStatus;
  txHash?: string;
  createdAt: Date;
  withdrawnAt?: Date;
}

export class PoolStake {
  readonly id: string;
  readonly publicId: string;
  readonly userId: string;
  readonly poolAddress: string;
  readonly amount: number;
  status: PoolStakeStatus;
  txHash?: string;
  readonly createdAt: Date;
  withdrawnAt?: Date;

  constructor(params: PoolStakeParams) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.poolAddress = params.poolAddress;
    this.amount = params.amount;
    this.status = params.status;
    this.txHash = params.txHash;
    this.createdAt = params.createdAt;
    this.withdrawnAt = params.withdrawnAt;
  }

  markAsActive(): this {
    this.status = PoolStakeStatus.ACTIVE;
    return this;
  }

  markAsUnstaking(): this {
    this.status = PoolStakeStatus.UNSTAKING;
    return this;
  }

  markAsWithdrawn(): this {
    this.status = PoolStakeStatus.WITHDRAWN;
    this.withdrawnAt = new Date();
    return this;
  }

  markAsFailed(): this {
    this.status = PoolStakeStatus.FAILED;
    return this;
  }
}
