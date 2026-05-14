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
var User = class _User {
  id;
  walletAddress;
  walletProvider;
  email;
  role;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.role = params.role;
    this.createdAt = params.createdAt;
  }
  withRole(role) {
    return new _User({ ...this, role });
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

// src/core/logger.ts
import pino from "pino";

// src/core/config.ts
import { z } from "zod";
var EnvSchema = z.object({
  DB_PROVIDER: z.enum(["memory", "postgres"]).default("postgres"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().default("reineira.xyz"),
  ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592e3),
  CHAIN_ID: z.coerce.number().default(421614),
  RPC_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:4831"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PORT: z.coerce.number().default(3e3),
  QUICKNODE_WEBHOOK_SECRET: z.string().optional(),
  RELAY_WEBHOOK_SECRET: z.string().optional(),
  PRIVATE_KEY: z.string().optional(),
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  PUSDC_WRAPPER_ADDRESS: z.string().optional(),
  RESOLVER_ADDRESS: z.string().optional(),
  POLICY_ADDRESS: z.string().optional(),
  EXPOSURE_REGISTRY_ADDRESS: z.string().optional(),
  CLAIMS_REGISTRY_ADDRESS: z.string().optional(),
  MOCK_DEBTOR_PROOF_ADDRESS: z.string().optional(),
  COVERAGE_MANAGER_ADDRESS: z.string().optional(),
  POOL_ADDRESS: z.string().optional(),
  POOL_FACTORY_ADDRESS: z.string().optional(),
  USDC_ADDRESS: z.string().optional(),
  FHE_WORKER_URL: z.string().default("http://localhost:3001"),
  ADMIN_PRIVATE_KEY: z.string().optional(),
  DEFAULT_CONCENTRATION_CAP_USDC: z.coerce.number().default(1e6)
});
var _env = null;
function getEnv() {
  if (!_env) {
    _env = EnvSchema.parse(process.env);
  }
  return _env;
}

// src/core/logger.ts
var _logger = null;
function getLogger(name) {
  if (!_logger) {
    _logger = pino({
      level: getEnv().LOG_LEVEL,
      formatters: {
        level: (label) => ({ level: label })
      }
    });
  }
  return name ? _logger.child({ name }) : _logger;
}

// src/application/use-case/auth/verify-wallet.use-case.ts
var logger = getLogger("VerifyWalletUseCase");
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
    let siweMessage;
    try {
      siweMessage = new SiweMessage(dto.message);
    } catch (e) {
      logger.error({ err: e instanceof Error ? e.message : String(e), message: dto.message }, "SiweMessage parse failed after valid sig");
      throw ApplicationHttpError.badRequest("Invalid SIWE message format");
    }
    const nonceValid = await this.nonceService.verifyNonce(dto.wallet_address, siweMessage.nonce);
    if (!nonceValid) {
      throw ApplicationHttpError.unauthorized("Invalid or expired nonce");
    }
    const ADMIN_WALLET = "0x24682566496932ddd71b8b89d2904e7761389b44";
    let user = await this.userRepository.findByWalletAddress(dto.wallet_address);
    if (!user) {
      user = new User({
        id: randomUUID(),
        walletAddress: dto.wallet_address,
        walletProvider: "zerodev",
        email: dto.email,
        role: dto.wallet_address.toLowerCase() === ADMIN_WALLET ? "ADMIN" : void 0,
        createdAt: /* @__PURE__ */ new Date()
      });
      try {
        await this.userRepository.save(user);
      } catch (e) {
        logger.error({ err: e instanceof Error ? e.message : String(e), walletAddress: dto.wallet_address }, "Failed to save user");
        throw e;
      }
    } else if (dto.wallet_address.toLowerCase() === ADMIN_WALLET && user.role !== "ADMIN") {
      user.role = "ADMIN";
      try {
        await this.userRepository.updateRole(user.id, "ADMIN");
      } catch (e) {
        logger.error({ err: e instanceof Error ? e.message : String(e), userId: user.id }, "Failed to update admin role");
      }
    }
    const tokenPair = await this.jwtService.generateTokenPair({
      sub: user.id,
      walletAddress: user.walletAddress,
      walletProvider: user.walletProvider,
      email: user.email,
      role: user.role
    });
    const session = new Session({
      id: randomUUID(),
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1e3),
      createdAt: /* @__PURE__ */ new Date()
    });
    try {
      await this.sessionRepository.save(session);
    } catch (e) {
      logger.error({ err: e instanceof Error ? e.message : String(e), userId: user.id }, "Failed to save session");
      throw e;
    }
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