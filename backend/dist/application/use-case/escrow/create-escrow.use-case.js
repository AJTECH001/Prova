// src/application/use-case/escrow/create-escrow.use-case.ts
import { randomUUID } from "crypto";
import { encodeAbiParameters, isAddress } from "viem";

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
  settledAt;
  resolverAddress;
  poolAddress;
  policyAddress;
  coverageId;
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
    this.settledAt = params.settledAt;
    this.resolverAddress = params.resolverAddress;
    this.poolAddress = params.poolAddress;
    this.policyAddress = params.policyAddress;
    this.coverageId = params.coverageId;
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
    this.settledAt = /* @__PURE__ */ new Date();
    return this;
  }
  markAsExpired() {
    this.status = "EXPIRED" /* EXPIRED */;
    return this;
  }
  markAsFunded() {
    this.status = "FUNDED" /* FUNDED */;
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

// src/application/use-case/escrow/create-escrow.use-case.ts
var DECIMALS = {
  USDC: 6,
  USDT: 6,
  USD: 2,
  EUR: 2
};
var DEFAULT_DECIMALS = 18;
var ABI_FUNCTION_SIGNATURE = "createEscrow((bytes,int32,uint8,bytes),(bytes,int32,uint8,bytes),address,bytes)";
var MIN_WAITING_PERIOD = BigInt(30 * 24 * 60 * 60);
function buildResolverData(buyerAddress, sellerAddress, invoiceAmount, deadlineDate, waitingPeriod = MIN_WAITING_PERIOD) {
  if (!isAddress(buyerAddress)) return "0x";
  const dueDate = deadlineDate ? BigInt(Math.floor((/* @__PURE__ */ new Date(deadlineDate + "T00:00:00Z")).getTime() / 1e3)) : BigInt(Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60);
  return encodeAbiParameters(
    [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "invoiceAmount", type: "uint256" },
      { name: "dueDate", type: "uint256" },
      { name: "waitingPeriod", type: "uint256" }
    ],
    [
      buyerAddress,
      sellerAddress,
      invoiceAmount,
      dueDate,
      waitingPeriod
    ]
  );
}
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
    const env = getEnv();
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
      createdAt: /* @__PURE__ */ new Date(),
      resolverAddress: dto.resolver_address ?? env.RESOLVER_ADDRESS,
      poolAddress: dto.insurance?.pool_address ?? env.POOL_ADDRESS,
      policyAddress: dto.insurance?.policy_address ?? env.POLICY_ADDRESS
    });
    await this.escrowRepository.save(escrow);
    const contractAddress = env.ESCROW_CONTRACT_ADDRESS ?? "";
    if (encryptionMode === "client") {
      const resolverData = buildResolverData(
        dto.counterparty ?? "",
        // buyer wallet address (Bruno)
        walletAddress,
        // seller wallet address (Amara)
        amountInSmallestUnit,
        dto.deadline
      );
      return {
        public_id: escrow.publicId,
        contract_address: contractAddress,
        abi_function_signature: ABI_FUNCTION_SIGNATURE,
        abi_parameters: {
          resolver: escrow.resolverAddress ?? "0x0000000000000000000000000000000000000000",
          resolver_data: resolverData
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