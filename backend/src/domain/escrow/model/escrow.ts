import { Currency } from './currency.js';
import { EscrowStatus } from './escrow-status.enum.js';

export interface EscrowParams {
  id: string;
  publicId: string;
  userId: string;
  type: string;
  counterparty?: string;
  deadline?: Date;
  externalReference?: string;
  amount: number;
  currency: Currency;
  status: EscrowStatus;
  walletId: string;
  metadata?: Record<string, unknown>;
  onChainEscrowId?: string;
  txHash?: string;
  createdAt: Date;
  settledAt?: Date;
  resolverAddress?: string;
  poolAddress?: string;
  policyAddress?: string;
  coverageId?: string;
}

export class Escrow {
  readonly id: string;
  readonly publicId: string;
  readonly userId: string;
  readonly type: string;
  readonly counterparty?: string;
  readonly deadline?: Date;
  readonly externalReference?: string;
  readonly amount: number;
  readonly currency: Currency;
  status: EscrowStatus;
  readonly walletId: string;
  readonly metadata?: Record<string, unknown>;
  onChainEscrowId?: string;
  txHash?: string;
  readonly createdAt: Date;
  settledAt?: Date;
  readonly resolverAddress?: string;
  readonly poolAddress?: string;
  readonly policyAddress?: string;
  coverageId?: string;

  constructor(params: EscrowParams) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.type = params.type;
    this.counterparty = params.counterparty;
    this.deadline = params.deadline;
    this.externalReference = params.externalReference;
    this.amount = params.amount;
    this.currency = params.currency;
    this.status = params.status;
    this.walletId = params.walletId;
    this.metadata = params.metadata;
    this.onChainEscrowId = params.onChainEscrowId;
    this.txHash = params.txHash;
    this.createdAt = params.createdAt;
    this.settledAt = params.settledAt;
    this.resolverAddress = params.resolverAddress;
    this.poolAddress = params.poolAddress;
    this.policyAddress = params.policyAddress;
    this.coverageId = params.coverageId;
  }

  markAsOnChain(): this {
    this.status = EscrowStatus.ON_CHAIN;
    return this;
  }

  markAsProcessing(): this {
    this.status = EscrowStatus.PROCESSING;
    return this;
  }

  markAsSettled(): this {
    this.status = EscrowStatus.SETTLED;
    this.settledAt = new Date();
    return this;
  }

  markAsExpired(): this {
    this.status = EscrowStatus.EXPIRED;
    return this;
  }

  markAsFunded(): this {
    this.status = EscrowStatus.FUNDED;
    return this;
  }

  markAsCanceled(): this {
    this.status = EscrowStatus.CANCELED;
    return this;
  }

  markAsFailed(): this {
    this.status = EscrowStatus.FAILED;
    return this;
  }

  markAsRedeemed(): this {
    this.status = EscrowStatus.REDEEMED;
    return this;
  }
}
