// src/core/errors.ts
var ApplicationHttpError = class _ApplicationHttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "ApplicationHttpError";
  }
  statusCode;
  details;
  static badRequest(message) {
    return new _ApplicationHttpError(400, message);
  }
  static unauthorized(message) {
    return new _ApplicationHttpError(401, message);
  }
  static forbidden(message) {
    return new _ApplicationHttpError(403, message);
  }
  static notFound(message) {
    return new _ApplicationHttpError(404, message);
  }
  static conflict(message) {
    return new _ApplicationHttpError(409, message);
  }
  static validationError(details) {
    return new _ApplicationHttpError(422, "Validation failed", details);
  }
  static internalError(message = "Internal server error") {
    return new _ApplicationHttpError(500, message);
  }
};

// src/application/use-case/transaction/report-escrow-transaction.use-case.ts
var ReportEscrowTransactionUseCase = class {
  constructor(escrowRepository, escrowEventRepository) {
    this.escrowRepository = escrowRepository;
    this.escrowEventRepository = escrowEventRepository;
  }
  escrowRepository;
  escrowEventRepository;
  async execute(dto, userId) {
    const escrow = await this.escrowRepository.findByPublicId(dto.entity_id);
    if (!escrow) {
      throw ApplicationHttpError.notFound("Escrow not found");
    }
    if (escrow.userId !== userId) {
      throw ApplicationHttpError.forbidden("Escrow does not belong to user");
    }
    escrow.markAsProcessing();
    escrow.txHash = dto.tx_hash;
    const bufferedEvent = await this.escrowEventRepository.findByTxHash(dto.tx_hash);
    if (bufferedEvent && bufferedEvent.eventType === "EscrowCreated") {
      escrow.markAsOnChain();
      escrow.onChainEscrowId = bufferedEvent.escrowId;
      await this.escrowEventRepository.delete(bufferedEvent.txHash);
    }
    await this.escrowRepository.update(escrow);
    return {
      entity_id: escrow.publicId,
      tx_hash: dto.tx_hash,
      status: escrow.status
    };
  }
};
export {
  ReportEscrowTransactionUseCase
};
//# sourceMappingURL=report-escrow-transaction.use-case.js.map