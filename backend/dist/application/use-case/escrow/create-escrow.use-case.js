// src/application/use-case/escrow/create-escrow.use-case.ts
import { randomUUID } from "crypto";

// src/domain/escrow/model/escrow.ts
var Escrow = class {
  id;
  publicId;
  userId;
  type;
  counterparty;
  deadline;
  externalReference;
  amount;
  currency;
  status;
  walletId;
  metadata;
  onChainEscrowId;
  txHash;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.type = params.type;
    this.counterparty = params.counterparty;
    this.deadline = params.deadline;
    this.externalReference = params.externalReference;
    this.amount = params.amount;
    this.currency = params.currency;
    this.status = params.status;
    this.walletId = params.walletId;
    this.metadata = params.metadata;
    this.onChainEscrowId = params.onChainEscrowId;
    this.txHash = params.txHash;
    this.createdAt = params.createdAt;
  }
  markAsOnChain() {
    this.status = "ON_CHAIN" /* ON_CHAIN */;
    return this;
  }
  markAsProcessing() {
    this.status = "PROCESSING" /* PROCESSING */;
    return this;
  }
  markAsSettled() {
    this.status = "SETTLED" /* SETTLED */;
    return this;
  }
  markAsExpired() {
    this.status = "EXPIRED" /* EXPIRED */;
    return this;
  }
  markAsCanceled() {
    this.status = "CANCELED" /* CANCELED */;
    return this;
  }
  markAsFailed() {
    this.status = "FAILED" /* FAILED */;
    return this;
  }
  markAsRedeemed() {
    this.status = "REDEEMED" /* REDEEMED */;
    return this;
  }
};

// src/domain/escrow/model/currency.ts
var Currency = class {
  type;
  code;
  constructor(params) {
    this.type = params.type;
    this.code = params.code;
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

// src/application/use-case/escrow/create-escrow.use-case.ts
var DECIMALS = {
  USDC: 6,
  USDT: 6,
  USD: 2,
  EUR: 2
};
var DEFAULT_DECIMALS = 18;
var ABI_FUNCTION_SIGNATURE = "createEscrow((bytes,int32,uint8,bytes),(bytes,int32,uint8,bytes),address,bytes)";
function toSmallestUnit(amount, currencyCode) {
  const decimals = DECIMALS[currencyCode.toUpperCase()] ?? DEFAULT_DECIMALS;
  return BigInt(Math.round(amount * 10 ** decimals));
}
var CreateEscrowUseCase = class {
  constructor(fheService, escrowRepository) {
    this.fheService = fheService;
    this.escrowRepository = escrowRepository;
  }
  fheService;
  escrowRepository;
  async execute(dto, userId, walletAddress, encryptionMode = "server") {
    const amountInSmallestUnit = toSmallestUnit(dto.amount, dto.currency.code);
    const escrow = new Escrow({
      id: randomUUID(),
      publicId: randomUUID(),
      userId,
      type: dto.type,
      counterparty: dto.counterparty,
      deadline: dto.deadline ? new Date(dto.deadline) : void 0,
      externalReference: dto.external_reference,
      amount: dto.amount,
      currency: new Currency({ type: dto.currency.type, code: dto.currency.code }),
      status: "PENDING" /* PENDING */,
      walletId: walletAddress,
      metadata: dto.metadata,
      createdAt: /* @__PURE__ */ new Date()
    });
    await this.escrowRepository.save(escrow);
    const contractAddress = getEnv().ESCROW_CONTRACT_ADDRESS ?? "";
    if (encryptionMode === "client") {
      return {
        public_id: escrow.publicId,
        contract_address: contractAddress,
        abi_function_signature: ABI_FUNCTION_SIGNATURE,
        abi_parameters: {
          resolver: "0x0000000000000000000000000000000000000000",
          resolver_data: "0x"
        },
        owner_address: walletAddress,
        amount: dto.amount,
        amount_smallest_unit: amountInSmallestUnit.toString()
      };
    }
    const encryptedData = await this.fheService.encryptEscrowData(amountInSmallestUnit, walletAddress, walletAddress);
    const abiParameters = encryptedData.getContractCallParameters();
    return {
      public_id: escrow.publicId,
      contract_address: contractAddress,
      abi_function_signature: ABI_FUNCTION_SIGNATURE,
      abi_parameters: abiParameters
    };
  }
};
export {
  CreateEscrowUseCase
};
//# sourceMappingURL=create-escrow.use-case.js.map