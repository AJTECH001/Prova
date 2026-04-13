// src/application/use-case/withdrawal/get-withdrawals.use-case.ts
var DEFAULT_LIMIT = 20;
function toWithdrawalResponse(w) {
  return {
    public_id: w.publicId,
    escrow_ids: w.escrowIds,
    destination_chain: w.destinationChain.toString(),
    recipient_address: w.recipientAddress,
    status: w.status,
    estimated_amount: w.estimatedAmount,
    actual_amount: w.actualAmount,
    fee: w.fee,
    redeem_tx_hash: w.redeemTxHash,
    bridge_tx_hash: w.bridgeTxHash,
    destination_tx_hash: w.destinationTxHash,
    error_message: w.errorMessage,
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
    completed_at: w.completedAt?.toISOString()
  };
}
var GetWithdrawalsUseCase = class {
  constructor(withdrawalRepository) {
    this.withdrawalRepository = withdrawalRepository;
  }
  withdrawalRepository;
  async execute(userId, options) {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const findOptions = {
      limit: limit + 1,
      cursor: options?.cursor,
      status: options?.status
    };
    const result = await this.withdrawalRepository.findByUserId(userId, findOptions);
    const hasMore = result.items.length > limit;
    const items = hasMore ? result.items.slice(0, limit) : result.items;
    return {
      items: items.map(toWithdrawalResponse),
      continuation_token: hasMore ? result.cursor : void 0,
      has_more: hasMore,
      limit
    };
  }
};
export {
  GetWithdrawalsUseCase,
  toWithdrawalResponse
};
//# sourceMappingURL=get-withdrawals.use-case.js.map