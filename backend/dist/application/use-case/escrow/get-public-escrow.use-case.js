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

// src/application/use-case/escrow/get-public-escrow.use-case.ts
var GetPublicEscrowUseCase = class {
  constructor(escrowRepository) {
    this.escrowRepository = escrowRepository;
  }
  escrowRepository;
  async execute(publicId) {
    const escrow = await this.escrowRepository.findByPublicId(publicId);
    if (!escrow) {
      throw ApplicationHttpError.notFound("Escrow not found");
    }
    return {
      public_id: escrow.publicId,
      on_chain_id: escrow.onChainEscrowId,
      type: escrow.type,
      counterparty: escrow.counterparty,
      deadline: escrow.deadline?.toISOString().split("T")[0],
      external_reference: escrow.externalReference,
      amount: escrow.amount,
      currency: { type: escrow.currency.type, code: escrow.currency.code },
      status: escrow.status,
      destination_chain_id: 6 /* BASE */,
      escrow_contract: getEnv().ESCROW_CONTRACT_ADDRESS ?? ""
    };
  }
};
export {
  GetPublicEscrowUseCase
};
//# sourceMappingURL=get-public-escrow.use-case.js.map