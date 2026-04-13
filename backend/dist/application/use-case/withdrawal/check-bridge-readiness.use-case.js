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

// src/application/use-case/withdrawal/check-bridge-readiness.use-case.ts
var CheckBridgeReadinessUseCase = class {
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
    const ready = withdrawal.status === "PENDING_BRIDGE" /* PENDING_BRIDGE */;
    return {
      public_id: withdrawal.publicId,
      ready,
      status: withdrawal.status
    };
  }
};
export {
  CheckBridgeReadinessUseCase
};
//# sourceMappingURL=check-bridge-readiness.use-case.js.map