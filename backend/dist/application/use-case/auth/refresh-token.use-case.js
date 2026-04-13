// src/application/use-case/auth/refresh-token.use-case.ts
import { randomUUID } from "crypto";

// src/domain/auth/model/session.ts
var Session = class {
  id;
  userId;
  refreshToken;
  expiresAt;
  createdAt;
  userAgent;
  ipAddress;
  constructor(params) {
    this.id = params.id;
    this.userId = params.userId;
    this.refreshToken = params.refreshToken;
    this.expiresAt = params.expiresAt;
    this.createdAt = params.createdAt;
    this.userAgent = params.userAgent;
    this.ipAddress = params.ipAddress;
  }
  isExpired() {
    return this.expiresAt < /* @__PURE__ */ new Date();
  }
  getTtlSeconds() {
    return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1e3));
  }
};

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

// src/application/use-case/auth/refresh-token.use-case.ts
var RefreshTokenUseCase = class {
  constructor(jwtService, sessionRepository, userRepository) {
    this.jwtService = jwtService;
    this.sessionRepository = sessionRepository;
    this.userRepository = userRepository;
  }
  jwtService;
  sessionRepository;
  userRepository;
  async execute(dto) {
    const payload = await this.jwtService.verifyRefreshToken(dto.refresh_token).catch(() => {
      throw ApplicationHttpError.unauthorized("Invalid refresh token");
    });
    const session = await this.sessionRepository.findByRefreshToken(dto.refresh_token);
    if (!session || session.isExpired()) {
      throw ApplicationHttpError.unauthorized("Session expired or not found");
    }
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw ApplicationHttpError.unauthorized("User not found");
    }
    await this.sessionRepository.delete(session.id);
    const tokenPair = await this.jwtService.generateTokenPair({
      sub: user.id,
      walletAddress: user.walletAddress,
      walletProvider: user.walletProvider,
      email: user.email
    });
    const newSession = new Session({
      id: randomUUID(),
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1e3),
      createdAt: /* @__PURE__ */ new Date()
    });
    await this.sessionRepository.save(newSession);
    return {
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      token_type: "Bearer",
      expires_in: tokenPair.expiresIn
    };
  }
};
export {
  RefreshTokenUseCase
};
//# sourceMappingURL=refresh-token.use-case.js.map