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

// src/application/use-case/escrow/get-escrows.use-case.ts
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

// src/application/use-case/escrow/get-escrow-by-id.use-case.ts
var GetEscrowByIdUseCase = class {
  constructor(escrowRepository) {
    this.escrowRepository = escrowRepository;
  }
  escrowRepository;
  async execute(publicId) {
    const escrow = await this.escrowRepository.findByPublicId(publicId);
    if (!escrow) {
      throw ApplicationHttpError.notFound("Escrow not found");
    }
    return toEscrowResponse(escrow);
  }
};
export {
  GetEscrowByIdUseCase
};
//# sourceMappingURL=get-escrow-by-id.use-case.js.map