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

// src/application/use-case/credential/revoke-credentials.use-case.ts
var RevokeCredentialsUseCase = class {
  constructor(credentialRepository) {
    this.credentialRepository = credentialRepository;
  }
  credentialRepository;
  async execute(clientId, userId) {
    const credential = await this.credentialRepository.findByClientId(clientId);
    if (!credential) {
      throw ApplicationHttpError.notFound("Credential not found");
    }
    if (credential.userId !== userId) {
      throw ApplicationHttpError.forbidden("Credential does not belong to user");
    }
    if (!credential.isActive()) {
      throw ApplicationHttpError.badRequest("Credential is already revoked");
    }
    credential.revoke();
    await this.credentialRepository.update(credential);
  }
};
export {
  RevokeCredentialsUseCase
};
//# sourceMappingURL=revoke-credentials.use-case.js.map