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

// src/application/use-case/transaction/report-withdrawal-transaction.use-case.ts
var ReportWithdrawalTransactionUseCase = class {
  constructor(withdrawalRepository) {
    this.withdrawalRepository = withdrawalRepository;
  }
  withdrawalRepository;
  async execute(dto, userId, publicId) {
    const withdrawal = await this.withdrawalRepository.findByPublicId(publicId);
    if (!withdrawal) {
      throw ApplicationHttpError.notFound("Withdrawal not found");
    }
    if (withdrawal.userId !== userId) {
      throw ApplicationHttpError.forbidden("Withdrawal does not belong to user");
    }
    if (dto.step === "redeem") {
      withdrawal.markRedeemComplete(dto.tx_hash);
    } else {
      withdrawal.markBridgeInitiated(dto.tx_hash);
    }
    await this.withdrawalRepository.update(withdrawal);
    return {
      tx_hash: dto.tx_hash,
      step: dto.step,
      status: withdrawal.status
    };
  }
};
export {
  ReportWithdrawalTransactionUseCase
};
//# sourceMappingURL=report-withdrawal-transaction.use-case.js.map