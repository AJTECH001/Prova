// src/infrastructure/auth/jwt.service.ts
import { SignJWT, jwtVerify } from "jose";

// src/core/config.ts
import { z } from "zod";
var EnvSchema = z.object({
  DB_PROVIDER: z.enum(["memory", "postgres"]).default("memory"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().default("reineira.xyz"),
  ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  REFRESH_TOKEN_TTL: z.coerce.number().default(2592e3),
  CHAIN_ID: z.coerce.number().default(421614),
  RPC_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PORT: z.coerce.number().default(3e3),
  QUICKNODE_WEBHOOK_SECRET: z.string().optional(),
  RELAY_WEBHOOK_SECRET: z.string().optional(),
  ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  PUSDC_WRAPPER_ADDRESS: z.string().optional(),
  FHE_WORKER_URL: z.string().default("http://localhost:3001")
});
var _env = null;
function getEnv() {
  if (!_env) {
    _env = EnvSchema.parse(process.env);
  }
  return _env;
}

// src/infrastructure/auth/jwt.service.ts
var JwtService = class {
  secret;
  issuer;
  accessTokenTtl;
  refreshTokenTtl;
  constructor() {
    const env = getEnv();
    this.secret = new TextEncoder().encode(env.JWT_SECRET);
    this.issuer = env.JWT_ISSUER;
    this.accessTokenTtl = env.ACCESS_TOKEN_TTL;
    this.refreshTokenTtl = env.REFRESH_TOKEN_TTL;
  }
  async generateTokenPair(payload) {
    const now = Math.floor(Date.now() / 1e3);
    const accessToken = await new SignJWT({
      walletAddress: payload.walletAddress,
      walletProvider: payload.walletProvider,
      email: payload.email
    }).setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuer(this.issuer).setIssuedAt(now).setExpirationTime(now + this.accessTokenTtl).sign(this.secret);
    const refreshToken = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuer(this.issuer).setIssuedAt(now).setExpirationTime(now + this.refreshTokenTtl).sign(this.secret);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtl
    };
  }
  async verifyAccessToken(token) {
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer
    });
    return {
      sub: payload.sub,
      walletAddress: payload.walletAddress,
      walletProvider: payload.walletProvider,
      email: payload.email
    };
  }
  async verifyRefreshToken(token) {
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer
    });
    return { sub: payload.sub };
  }
};
export {
  JwtService
};
//# sourceMappingURL=jwt.service.js.map