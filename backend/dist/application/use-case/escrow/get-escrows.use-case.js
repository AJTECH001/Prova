// src/application/use-case/escrow/get-escrows.use-case.ts
var DEFAULT_LIMIT = 20;
function toEscrowResponse(escrow) {
  return {
    public_id: escrow.publicId,
    type: escrow.type,
    counterparty: escrow.counterparty,
    deadline: escrow.deadline?.toISOString().split("T")[0],
    external_reference: escrow.externalReference,
    amount: escrow.amount,
    currency: { type: escrow.currency.type, code: escrow.currency.code },
    status: escrow.status,
    on_chain_id: escrow.onChainEscrowId,
    tx_hash: escrow.txHash,
    metadata: escrow.metadata,
    created_at: escrow.createdAt.toISOString()
  };
}
var GetEscrowsUseCase = class {
  constructor(escrowRepository) {
    this.escrowRepository = escrowRepository;
  }
  escrowRepository;
  async execute(userId, options) {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const findOptions = {
      limit: limit + 1,
      cursor: options?.cursor,
      status: options?.status
    };
    const result = await this.escrowRepository.findByUserId(userId, findOptions);
    const hasMore = result.items.length > limit;
    const items = hasMore ? result.items.slice(0, limit) : result.items;
    return {
      items: items.map(toEscrowResponse),
      continuation_token: hasMore ? result.cursor : void 0,
      has_more: hasMore,
      limit
    };
  }
};
export {
  GetEscrowsUseCase,
  toEscrowResponse
};
//# sourceMappingURL=get-escrows.use-case.js.map