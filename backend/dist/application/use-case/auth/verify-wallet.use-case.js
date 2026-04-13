// src/application/use-case/auth/verify-wallet.use-case.ts
import { randomUUID } from "crypto";
import { SiweMessage } from "siwe";

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

// src/domain/auth/model/user.ts
var User = class {
  id;
  walletAddress;
  walletProvider;
  email;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.createdAt = params.createdAt;
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

// src/application/use-case/auth/verify-wallet.use-case.ts
var VerifyWalletUseCase = class {
  constructor(siweVerifier, nonceService, userRepository, sessionRepository, jwtService) {
    this.siweVerifier = siweVerifier;
    this.nonceService = nonceService;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.jwtService = jwtService;
  }
  siweVerifier;
  nonceService;
  userRepository;
  sessionRepository;
  jwtService;
  async execute(dto) {
    const result = await this.siweVerifier.verify(dto.message, dto.signature);
    if (!result.valid) {
      throw ApplicationHttpError.unauthorized("Invalid SIWE signature");
    }
    const siweMessage = new SiweMessage(dto.message);
    const nonceValid = await this.nonceService.verifyNonce(dto.wallet_address, siweMessage.nonce);
    if (!nonceValid) {
      throw ApplicationHttpError.unauthorized("Invalid or expired nonce");
    }
    let user = await this.userRepository.findByWalletAddress(dto.wallet_address);
    if (!user) {
      user = new User({
        id: randomUUID(),
        walletAddress: dto.wallet_address,
        walletProvider: "walletconnect",
        email: dto.email,
        createdAt: /* @__PURE__ */ new Date()
      });
      await this.userRepository.save(user);
    }
    const tokenPair = await this.jwtService.generateTokenPair({
      sub: user.id,
      walletAddress: user.walletAddress,
      walletProvider: user.walletProvider,
      email: user.email
    });
    const session = new Session({
      id: randomUUID(),
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1e3),
      createdAt: /* @__PURE__ */ new Date()
    });
    await this.sessionRepository.save(session);
    return {
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      token_type: "Bearer",
      expires_in: tokenPair.expiresIn
    };
  }
};
export {
  VerifyWalletUseCase
};
//# sourceMappingURL=verify-wallet.use-case.js.map