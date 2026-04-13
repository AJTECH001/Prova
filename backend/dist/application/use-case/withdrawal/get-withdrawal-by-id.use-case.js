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

// src/application/use-case/withdrawal/get-withdrawals.use-case.ts
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

// src/application/use-case/withdrawal/get-withdrawal-by-id.use-case.ts
var GetWithdrawalByIdUseCase = class {
  constructor(withdrawalRepository) {
    this.withdrawalRepository = withdrawalRepository;
  }
  withdrawalRepository;
  async execute(publicId, userId) {
    const withdrawal = await this.withdrawalRepository.findByPublicId(publicId);
    if (!withdrawal) {
      throw ApplicationHttpError.notFound("Withdrawal not found");
    }
    if (withdrawal.userId !== userId) {
      throw ApplicationHttpError.forbidden("Withdrawal does not belong to user");
    }
    return toWithdrawalResponse(withdrawal);
  }
};
export {
  GetWithdrawalByIdUseCase
};
//# sourceMappingURL=get-withdrawal-by-id.use-case.js.map