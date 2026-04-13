// src/infrastructure/auth/siwe-verifier.ts
import { SiweMessage } from "siwe";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

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

// src/core/logger.ts
import pino from "pino";
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

// src/infrastructure/auth/siwe-verifier.ts
var logger = getLogger("SiweVerifier");
var SiweVerifier = class {
  async verify(message, signature) {
    try {
      const siweMessage = new SiweMessage(message);
      const address = siweMessage.address;
      logger.info({ address, nonce: siweMessage.nonce }, "Verifying SIWE signature");
      const rpcUrl = getEnv().RPC_URL || void 0;
      if (!rpcUrl) {
        logger.warn("RPC_URL not set, ERC-6492 verification will fail for smart accounts");
      }
      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(rpcUrl)
      });
      const valid = await publicClient.verifyMessage({
        address,
        message,
        signature
      });
      logger.info({ address, valid }, "SIWE verification result");
      return { address: siweMessage.address, valid };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, "SIWE verification failed");
      return { address: "", valid: false };
    }
  }
};
export {
  SiweVerifier
};
//# sourceMappingURL=siwe-verifier.js.map