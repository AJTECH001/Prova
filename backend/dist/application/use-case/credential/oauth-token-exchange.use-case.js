// src/application/use-case/credential/oauth-token-exchange.use-case.ts
import { scrypt } from "crypto";
import { promisify } from "util";

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

// src/application/use-case/credential/oauth-token-exchange.use-case.ts
var scryptAsync = promisify(scrypt);
var OAuthTokenExchangeUseCase = class {
  constructor(credentialRepository, jwtService) {
    this.credentialRepository = credentialRepository;
    this.jwtService = jwtService;
  }
  credentialRepository;
  jwtService;
  async execute(dto) {
    const credential = await this.credentialRepository.findByClientId(dto.client_id);
    if (!credential) {
      throw ApplicationHttpError.unauthorized("Invalid client credentials");
    }
    if (!credential.isActive()) {
      throw ApplicationHttpError.unauthorized("Client credentials have been revoked");
    }
    const hashedInput = (await scryptAsync(dto.client_secret, credential.salt, 64)).toString("hex");
    if (hashedInput !== credential.hashedSecret) {
      throw ApplicationHttpError.unauthorized("Invalid client credentials");
    }
    credential.touch();
    await this.credentialRepository.update(credential);
    const tokenPair = await this.jwtService.generateTokenPair({
      sub: credential.userId,
      walletAddress: "",
      walletProvider: "oauth"
    });
    return {
      access_token: tokenPair.accessToken,
      token_type: "Bearer",
      expires_in: tokenPair.expiresIn
    };
  }
};
export {
  OAuthTokenExchangeUseCase
};
//# sourceMappingURL=oauth-token-exchange.use-case.js.map