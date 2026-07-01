import { DisputeStatus } from './dispute-status.enum.js';

export interface DisputeParams {
  id: string;
  publicId: string;
  escrowId: string;
  coverageId: string;
  userId: string;
  walletId: string;
  status: DisputeStatus;
  disputeProof?: string;
  txHash?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A trade-credit claim / dispute over a covered escrow.
 *
 * Lifecycle: FILED → ACCEPTED | REJECTED. The on-chain judgment
 * (`TradeCreditInsurancePolicy.judge`) is `onlyBoundManager`, so it is invoked by the
 * ReineiraOS coverage manager, not this backend directly; this entity tracks the
 * off-chain lifecycle and records the resolution (see resolve-claim.use-case).
 */
export class Dispute {
  readonly id: string;
  readonly publicId: string;
  readonly escrowId: string;
  readonly coverageId: string;
  readonly userId: string;
  readonly walletId: string;
  status: DisputeStatus;
  disputeProof?: string;
  txHash?: string;
  errorMessage?: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: DisputeParams) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.escrowId = params.escrowId;
    this.coverageId = params.coverageId;
    this.userId = params.userId;
    this.walletId = params.walletId;
    this.status = params.status;
    this.disputeProof = params.disputeProof;
    this.txHash = params.txHash;
    this.errorMessage = params.errorMessage;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  markAccepted(txHash?: string): this {
    this.status = DisputeStatus.ACCEPTED;
    if (txHash) this.txHash = txHash;
    this.errorMessage = undefined;
    this.updatedAt = new Date();
    return this;
  }

  markRejected(reason: string): this {
    this.status = DisputeStatus.REJECTED;
    this.errorMessage = reason;
    this.updatedAt = new Date();
    return this;
  }

  isOpen(): boolean {
    return this.status === DisputeStatus.PENDING || this.status === DisputeStatus.FILED;
  }

  isTerminal(): boolean {
    return this.status === DisputeStatus.ACCEPTED || this.status === DisputeStatus.REJECTED;
  }
}
