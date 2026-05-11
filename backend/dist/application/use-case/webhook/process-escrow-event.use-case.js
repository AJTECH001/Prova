// src/domain/escrow/events/model/escrow-event.ts
var EscrowEvent = class {
  txHash;
  escrowId;
  eventType;
  blockNumber;
  createdAt;
  ttl;
  messageHash;
  amount;
  constructor(params) {
    this.txHash = params.txHash;
    this.escrowId = params.escrowId;
    this.eventType = params.eventType;
    this.blockNumber = params.blockNumber;
    this.createdAt = params.createdAt;
    this.ttl = params.ttl;
    this.messageHash = params.messageHash;
    this.amount = params.amount;
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

// src/application/use-case/webhook/process-escrow-event.use-case.ts
var logger = getLogger("ProcessEscrowEventUseCase");
var ProcessEscrowEventUseCase = class {
  constructor(escrowRepository, escrowEventRepository, computeCreditScoreUseCase) {
    this.escrowRepository = escrowRepository;
    this.escrowEventRepository = escrowEventRepository;
    this.computeCreditScoreUseCase = computeCreditScoreUseCase;
  }
  escrowRepository;
  escrowEventRepository;
  computeCreditScoreUseCase;
  async execute(events) {
    for (const event of events) {
      if (event.event_type === "EscrowCreated") {
        await this.handleEscrowCreated(event);
      } else if (event.event_type === "EscrowFunded") {
        await this.handleEscrowFunded(event);
      } else if (event.event_type === "EscrowRedeemed") {
        await this.handleEscrowRedeemed(event);
      } else if (event.event_type === "EscrowSettled") {
        await this.handleEscrowSettled(event);
      }
    }
  }
  async handleEscrowCreated(event) {
    const escrow = await this.escrowRepository.findByTxHash(event.tx_hash);
    if (escrow && escrow.status === "PROCESSING" /* PROCESSING */) {
      escrow.markAsOnChain();
      escrow.onChainEscrowId = event.escrow_id;
      await this.escrowRepository.update(escrow);
      return;
    }
    const bufferedEvent = new EscrowEvent({
      txHash: event.tx_hash,
      escrowId: event.escrow_id,
      eventType: event.event_type,
      blockNumber: event.block_number,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ttl: Math.floor(Date.now() / 1e3) + 86400,
      messageHash: event.message_hash,
      amount: event.amount
    });
    await this.escrowEventRepository.save(bufferedEvent);
  }
  async handleEscrowFunded(event) {
    const escrow = await this.escrowRepository.findByOnChainId(event.escrow_id);
    if (escrow && escrow.status === "ON_CHAIN" /* ON_CHAIN */) {
      escrow.markAsFunded();
      await this.escrowRepository.update(escrow);
    }
  }
  // EscrowRedeemed — the real on-chain event emitted by ConfidentialEscrow when funds are released.
  async handleEscrowRedeemed(event) {
    const escrow = await this.escrowRepository.findByOnChainId(event.escrow_id);
    if (escrow && escrow.status === "FUNDED" /* FUNDED */) {
      escrow.markAsRedeemed();
      await this.escrowRepository.update(escrow);
      const buyerWallet = escrow.counterparty ?? escrow.walletId;
      if (this.computeCreditScoreUseCase) {
        try {
          const result = await this.computeCreditScoreUseCase.execute(escrow.userId, buyerWallet);
          logger.info(
            { userId: escrow.userId, buyerWallet, rawScore: result.rawScore },
            "Credit score recomputed after escrow redemption"
          );
        } catch (err) {
          logger.warn({ userId: escrow.userId, err }, "Credit score recomputation failed after redemption");
        }
      }
    }
  }
  // EscrowSettled — kept for backwards-compatibility with older webhook payloads.
  async handleEscrowSettled(event) {
    const escrow = await this.escrowRepository.findByOnChainId(event.escrow_id);
    if (escrow && escrow.status === "ON_CHAIN" /* ON_CHAIN */) {
      escrow.markAsSettled();
      await this.escrowRepository.update(escrow);
      const buyerWallet = escrow.counterparty ?? escrow.walletId;
      if (this.computeCreditScoreUseCase) {
        try {
          const result = await this.computeCreditScoreUseCase.execute(escrow.userId, buyerWallet);
          logger.info(
            { userId: escrow.userId, buyerWallet, rawScore: result.rawScore },
            "Credit score recomputed after escrow settlement"
          );
        } catch (err) {
          logger.warn({ userId: escrow.userId, err }, "Credit score computation failed after settlement");
        }
      }
    }
  }
};
export {
  ProcessEscrowEventUseCase
};
//# sourceMappingURL=process-escrow-event.use-case.js.map