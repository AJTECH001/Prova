// src/domain/escrow/events/model/escrow-event.ts
var EscrowEvent = class {
  txHash;
  escrowId;
  eventType;
  blockNumber;
  createdAt;
  ttl;
  messageHash;
  amount;
  constructor(params) {
    this.txHash = params.txHash;
    this.escrowId = params.escrowId;
    this.eventType = params.eventType;
    this.blockNumber = params.blockNumber;
    this.createdAt = params.createdAt;
    this.ttl = params.ttl;
    this.messageHash = params.messageHash;
    this.amount = params.amount;
  }
};

// src/application/use-case/webhook/process-escrow-event.use-case.ts
var ProcessEscrowEventUseCase = class {
  constructor(escrowRepository, escrowEventRepository) {
    this.escrowRepository = escrowRepository;
    this.escrowEventRepository = escrowEventRepository;
  }
  escrowRepository;
  escrowEventRepository;
  async execute(events) {
    for (const event of events) {
      if (event.event_type === "EscrowCreated") {
        await this.handleEscrowCreated(event);
      } else if (event.event_type === "EscrowSettled") {
        await this.handleEscrowSettled(event);
      }
    }
  }
  async handleEscrowCreated(event) {
    const escrow = await this.escrowRepository.findByTxHash(event.tx_hash);
    if (escrow && escrow.status === "PROCESSING" /* PROCESSING */) {
      escrow.markAsOnChain();
      escrow.onChainEscrowId = event.escrow_id;
      await this.escrowRepository.update(escrow);
      return;
    }
    const bufferedEvent = new EscrowEvent({
      txHash: event.tx_hash,
      escrowId: event.escrow_id,
      eventType: event.event_type,
      blockNumber: event.block_number,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ttl: Math.floor(Date.now() / 1e3) + 86400,
      messageHash: event.message_hash,
      amount: event.amount
    });
    await this.escrowEventRepository.save(bufferedEvent);
  }
  async handleEscrowSettled(event) {
    const escrow = await this.escrowRepository.findByOnChainId(event.escrow_id);
    if (escrow && escrow.status === "ON_CHAIN" /* ON_CHAIN */) {
      escrow.markAsSettled();
      await this.escrowRepository.update(escrow);
    }
  }
};
export {
  ProcessEscrowEventUseCase
};
//# sourceMappingURL=process-escrow-event.use-case.js.map