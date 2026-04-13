// src/application/use-case/withdrawal/create-withdrawal.use-case.ts
import { randomUUID } from "crypto";

// src/domain/withdrawal/model/withdrawal.ts
var Withdrawal = class {
  id;
  publicId;
  userId;
  walletId;
  escrowIds;
  destinationChain;
  destinationDomain;
  recipientAddress;
  status;
  estimatedAmount;
  walletProvider;
  actualAmount;
  fee;
  redeemTxHash;
  bridgeTxHash;
  destinationTxHash;
  errorMessage;
  createdAt;
  updatedAt;
  completedAt;
  constructor(params) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.walletId = params.walletId;
    this.escrowIds = params.escrowIds;
    this.destinationChain = params.destinationChain;
    this.destinationDomain = params.destinationDomain;
    this.recipientAddress = params.recipientAddress;
    this.status = params.status;
    this.estimatedAmount = params.estimatedAmount;
    this.walletProvider = params.walletProvider;
    this.actualAmount = params.actualAmount;
    this.fee = params.fee;
    this.redeemTxHash = params.redeemTxHash;
    this.bridgeTxHash = params.bridgeTxHash;
    this.destinationTxHash = params.destinationTxHash;
    this.errorMessage = params.errorMessage;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.completedAt = params.completedAt;
  }
  markRedeemComplete(txHash) {
    this.redeemTxHash = txHash;
    this.status = "PENDING_BRIDGE" /* PENDING_BRIDGE */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markBridgeInitiated(txHash) {
    this.bridgeTxHash = txHash;
    this.status = "BRIDGING" /* BRIDGING */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markCompleted(destinationTxHash) {
    this.destinationTxHash = destinationTxHash;
    this.status = "COMPLETED" /* COMPLETED */;
    this.updatedAt = /* @__PURE__ */ new Date();
    this.completedAt = /* @__PURE__ */ new Date();
    return this;
  }
  markFailed(errorMessage) {
    this.errorMessage = errorMessage;
    this.status = "FAILED" /* FAILED */;
    this.updatedAt = /* @__PURE__ */ new Date();
    return this;
  }
  canCreateBridgeChallenge() {
    return this.status === "PENDING_BRIDGE" /* PENDING_BRIDGE */;
  }
  isTerminal() {
    return this.status === "COMPLETED" /* COMPLETED */ || this.status === "FAILED" /* FAILED */;
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

// src/application/use-case/withdrawal/create-withdrawal.use-case.ts
var CHAIN_TO_DESTINATION = {
  ETH: 0 /* ETH */,
  BASE: 6 /* BASE */,
  POLYGON: 7 /* POLYGON */
};
function generatePublicId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "WD-";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
var CreateWithdrawalUseCase = class {
  constructor(escrowRepository, withdrawalRepository) {
    this.escrowRepository = escrowRepository;
    this.withdrawalRepository = withdrawalRepository;
  }
  escrowRepository;
  withdrawalRepository;
  async execute(dto, userId, walletAddress) {
    let estimatedAmount = 0;
    const onChainIds = [];
    for (const escrowId of dto.escrow_ids) {
      const escrow = await this.escrowRepository.findByOnChainId(String(escrowId));
      if (!escrow) {
        throw ApplicationHttpError.notFound(`Escrow with on-chain ID ${escrowId} not found`);
      }
      if (escrow.userId !== userId) {
        throw ApplicationHttpError.forbidden("Escrow does not belong to user");
      }
      if (escrow.status !== "SETTLED" /* SETTLED */) {
        throw ApplicationHttpError.badRequest(`Escrow ${escrowId} is not in SETTLED status`);
      }
      estimatedAmount += escrow.amount;
      onChainIds.push(escrowId);
    }
    const destinationChain = CHAIN_TO_DESTINATION[dto.destination_chain];
    const publicId = generatePublicId();
    const now = /* @__PURE__ */ new Date();
    const withdrawal = new Withdrawal({
      id: randomUUID(),
      publicId,
      userId,
      walletId: walletAddress,
      escrowIds: onChainIds,
      destinationChain,
      destinationDomain: destinationChain,
      recipientAddress: dto.recipient_address,
      status: "PENDING_REDEEM" /* PENDING_REDEEM */,
      estimatedAmount,
      walletProvider: "walletconnect",
      createdAt: now,
      updatedAt: now
    });
    await this.withdrawalRepository.save(withdrawal);
    const escrowContract = getEnv().ESCROW_CONTRACT_ADDRESS ?? "";
    return {
      public_id: publicId,
      calls: [
        {
          contract_address: escrowContract,
          abi_function_signature: "redeemMultiple(uint256[])",
          abi_parameters: { escrow_ids: onChainIds }
        },
        {
          contract_address: getEnv().PUSDC_WRAPPER_ADDRESS ?? "",
          abi_function_signature: "unwrap(uint256)",
          abi_parameters: { amount: estimatedAmount }
        }
      ],
      status: withdrawal.status,
      estimated_amount: estimatedAmount
    };
  }
};
export {
  CreateWithdrawalUseCase
};
//# sourceMappingURL=create-withdrawal.use-case.js.map