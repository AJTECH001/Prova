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

// src/application/use-case/user/get-current-user.use-case.ts
var GetCurrentUserUseCase = class {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  userRepository;
  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw ApplicationHttpError.notFound("User not found");
    }
    return {
      id: user.id,
      wallet_address: user.walletAddress,
      wallet_provider: user.walletProvider,
      email: user.email,
      created_at: user.createdAt.toISOString()
    };
  }
};
export {
  GetCurrentUserUseCase
};
//# sourceMappingURL=get-current-user.use-case.js.map