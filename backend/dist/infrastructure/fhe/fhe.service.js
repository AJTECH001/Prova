// src/domain/fhe/model/encrypted-value.ts
var EncryptedValue = class _EncryptedValue {
  type;
  data;
  securityZone;
  utype;
  inputProof;
  userAddress;
  constructor(params) {
    this.type = params.type;
    this.data = params.data;
    this.securityZone = params.securityZone;
    this.utype = params.utype;
    this.inputProof = params.inputProof;
    this.userAddress = params.userAddress;
  }
  isForUser(address) {
    return this.userAddress.toLowerCase() === address.toLowerCase();
  }
  toTuple() {
    return [this.data, this.securityZone, this.utype, this.inputProof];
  }
  toJSON() {
    return {
      type: this.type,
      data: this.data,
      securityZone: this.securityZone,
      utype: this.utype,
      inputProof: this.inputProof,
      userAddress: this.userAddress
    };
  }
  static fromJSON(json) {
    const obj = json;
    return new _EncryptedValue({
      type: obj.type,
      data: obj.data,
      securityZone: obj.securityZone,
      utype: obj.utype,
      inputProof: obj.inputProof,
      userAddress: obj.userAddress
    });
  }
};

// src/domain/fhe/model/encrypted-escrow-data.ts
var EncryptedEscrowData = class _EncryptedEscrowData {
  encryptedAmount;
  encryptedOwner;
  userAddress;
  plaintextAmount;
  plaintextOwner;
  constructor(params) {
    this.encryptedAmount = params.encryptedAmount;
    this.encryptedOwner = params.encryptedOwner;
    this.userAddress = params.userAddress;
    this.plaintextAmount = params.plaintextAmount;
    this.plaintextOwner = params.plaintextOwner;
  }
  isForUser(address) {
    return this.userAddress.toLowerCase() === address.toLowerCase();
  }
  getContractCallParameters() {
    return {
      encrypted_owner: this.encryptedOwner.toTuple(),
      encrypted_amount: this.encryptedAmount.toTuple(),
      resolver: "0x0000000000000000000000000000000000000000",
      resolver_data: "0x"
    };
  }
  toJSON() {
    return {
      encryptedAmount: this.encryptedAmount.toJSON(),
      encryptedOwner: this.encryptedOwner.toJSON(),
      userAddress: this.userAddress,
      plaintextAmount: this.plaintextAmount?.toString(),
      plaintextOwner: this.plaintextOwner
    };
  }
  static fromJSON(json) {
    const obj = json;
    return new _EncryptedEscrowData({
      encryptedAmount: EncryptedValue.fromJSON(obj.encryptedAmount),
      encryptedOwner: EncryptedValue.fromJSON(obj.encryptedOwner),
      userAddress: obj.userAddress,
      plaintextAmount: obj.plaintextAmount ? BigInt(obj.plaintextAmount) : void 0,
      plaintextOwner: obj.plaintextOwner
    });
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

// src/infrastructure/fhe/fhe-worker.client.ts
var FheWorkerClient = class {
  baseUrl;
  logger;
  constructor() {
    this.baseUrl = getEnv().FHE_WORKER_URL;
    this.logger = getLogger("FheWorkerClient");
  }
  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/health/ready`, {
        signal: AbortSignal.timeout(3e3)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  async encryptBatch(userAddress, items) {
    this.logger.info({ userAddress, itemCount: items.length }, "Encrypting batch via FHE worker");
    const res = await fetch(`${this.baseUrl}/api/v1/encrypt/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userAddress, items }),
      signal: AbortSignal.timeout(6e4)
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      this.logger.error({ status: res.status, error }, "FHE worker encryption failed");
      if (res.status === 503) {
        throw ApplicationHttpError.internalError("FHE worker not ready");
      }
      throw ApplicationHttpError.internalError(
        `FHE encryption failed: ${error.detail || res.statusText}`
      );
    }
    const data = await res.json();
    this.logger.info({ totalTime: data.totalEncryptionTimeMs }, "FHE batch encryption complete");
    return data;
  }
};

// src/infrastructure/fhe/fhe.service.ts
var FheService = class {
  client;
  logger;
  initialized = false;
  constructor() {
    this.client = new FheWorkerClient();
    this.logger = getLogger("FheService");
  }
  async ensureInitialized() {
    if (this.initialized) return;
    const healthy = await this.client.healthCheck();
    if (!healthy) {
      this.logger.warn("FHE worker not available, encryption may fail");
    }
    this.initialized = true;
  }
  async encryptEscrowData(amount, ownerAddress, userAddress) {
    await this.ensureInitialized();
    const response = await this.client.encryptBatch(userAddress, [
      { type: "euint64", value: amount.toString() },
      { type: "eaddress", value: ownerAddress }
    ]);
    const [amountResult, ownerResult] = response.results;
    const encryptedAmount = new EncryptedValue({
      type: "euint64",
      data: amountResult.data,
      securityZone: amountResult.securityZone,
      utype: amountResult.utype,
      inputProof: amountResult.inputProof,
      userAddress
    });
    const encryptedOwner = new EncryptedValue({
      type: "eaddress",
      data: ownerResult.data,
      securityZone: ownerResult.securityZone,
      utype: ownerResult.utype,
      inputProof: ownerResult.inputProof,
      userAddress
    });
    return new EncryptedEscrowData({
      encryptedAmount,
      encryptedOwner,
      userAddress,
      plaintextAmount: amount,
      plaintextOwner: ownerAddress
    });
  }
};
export {
  FheService
};
//# sourceMappingURL=fhe.service.js.map