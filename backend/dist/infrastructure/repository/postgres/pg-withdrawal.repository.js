// src/infrastructure/repository/postgres/pg-withdrawal.repository.ts
import { and, eq, lt, desc } from "drizzle-orm";

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

// src/infrastructure/repository/postgres/schema.ts
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  index,
  primaryKey
} from "drizzle-orm/pg-core";
var escrowStatusEnum = pgEnum("escrow_status", [
  "PENDING",
  "ON_CHAIN",
  "PROCESSING",
  "SETTLED",
  "REDEEMED",
  "EXPIRED",
  "CANCELED",
  "FAILED"
]);
var withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "PENDING_REDEEM",
  "PENDING_BRIDGE",
  "BRIDGING",
  "COMPLETED",
  "FAILED"
]);
var walletProviderEnum = pgEnum("wallet_provider", [
  "zerodev",
  "walletconnect"
]);
var businessTypeEnum = pgEnum("business_type", ["RETAIL", "SERVICE"]);
var credentialStatusEnum = pgEnum("credential_status", [
  "active",
  "revoked"
]);
var escrowEventTypeEnum = pgEnum("escrow_event_type", [
  "EscrowCreated",
  "EscrowSettled"
]);
var users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    walletAddress: text("wallet_address").unique().notNull(),
    walletProvider: walletProviderEnum("wallet_provider").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => [index("users_wallet_address_idx").on(t.walletAddress)]
);
var sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id).notNull(),
    refreshToken: text("refresh_token").unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address")
  },
  (t) => [
    index("sessions_refresh_token_idx").on(t.refreshToken),
    index("sessions_user_id_idx").on(t.userId)
  ]
);
var nonces = pgTable(
  "nonces",
  {
    walletAddress: text("wallet_address").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: integer("expires_at").notNull()
  },
  (t) => [primaryKey({ columns: [t.walletAddress, t.nonce] })]
);
var escrows = pgTable(
  "escrows",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").unique().notNull(),
    userId: text("user_id").references(() => users.id).notNull(),
    type: text("type").notNull(),
    counterparty: text("counterparty"),
    deadline: timestamp("deadline"),
    externalReference: text("external_reference"),
    amount: numeric("amount").notNull(),
    currencyType: text("currency_type").notNull(),
    currencyCode: text("currency_code").notNull(),
    status: escrowStatusEnum("status").notNull().default("PENDING"),
    walletId: text("wallet_id").notNull(),
    metadata: jsonb("metadata"),
    onChainEscrowId: text("on_chain_escrow_id"),
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => [
    index("escrows_public_id_idx").on(t.publicId),
    index("escrows_user_id_status_idx").on(t.userId, t.status),
    index("escrows_tx_hash_idx").on(t.txHash),
    index("escrows_on_chain_escrow_id_idx").on(t.onChainEscrowId)
  ]
);
var withdrawals = pgTable(
  "withdrawals",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").unique().notNull(),
    userId: text("user_id").references(() => users.id).notNull(),
    walletId: text("wallet_id").notNull(),
    escrowIds: jsonb("escrow_ids").notNull().$type(),
    destinationChain: integer("destination_chain").notNull(),
    destinationDomain: integer("destination_domain").notNull(),
    recipientAddress: text("recipient_address").notNull(),
    status: withdrawalStatusEnum("status").notNull().default("PENDING_REDEEM"),
    estimatedAmount: numeric("estimated_amount").notNull(),
    walletProvider: text("wallet_provider").notNull(),
    actualAmount: numeric("actual_amount"),
    fee: numeric("fee"),
    redeemTxHash: text("redeem_tx_hash"),
    bridgeTxHash: text("bridge_tx_hash"),
    destinationTxHash: text("destination_tx_hash"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at")
  },
  (t) => [
    index("withdrawals_public_id_idx").on(t.publicId),
    index("withdrawals_user_id_status_idx").on(t.userId, t.status)
  ]
);
var businessProfiles = pgTable(
  "business_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id).unique().notNull(),
    businessName: text("business_name").notNull(),
    businessType: businessTypeEnum("business_type").notNull(),
    businessAddress: text("business_address"),
    taxId: text("tax_id")
  },
  (t) => [index("business_profiles_user_id_idx").on(t.userId)]
);
var apiCredentials = pgTable(
  "api_credentials",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").unique().notNull(),
    userId: text("user_id").references(() => users.id).notNull(),
    hashedSecret: text("hashed_secret").notNull(),
    salt: text("salt").notNull(),
    status: credentialStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at")
  },
  (t) => [
    index("api_credentials_client_id_idx").on(t.clientId),
    index("api_credentials_user_id_idx").on(t.userId)
  ]
);
var escrowEvents = pgTable(
  "escrow_events",
  {
    txHash: text("tx_hash").primaryKey(),
    escrowId: text("escrow_id").notNull(),
    eventType: escrowEventTypeEnum("event_type").notNull(),
    blockNumber: text("block_number").notNull(),
    createdAt: text("created_at").notNull(),
    ttl: integer("ttl").notNull(),
    messageHash: text("message_hash"),
    amount: text("amount")
  },
  (t) => [index("escrow_events_escrow_id_idx").on(t.escrowId)]
);

// src/infrastructure/repository/postgres/pg-withdrawal.repository.ts
var PgWithdrawalRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByPublicId(publicId) {
    const row = await this.db.query.withdrawals.findFirst({
      where: eq(withdrawals.publicId, publicId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId, options) {
    const limit = options?.limit ?? 20;
    const conditions = [eq(withdrawals.userId, userId)];
    if (options?.status) {
      conditions.push(eq(withdrawals.status, options.status));
    }
    if (options?.cursor) {
      const cursorRow = await this.db.query.withdrawals.findFirst({
        where: eq(withdrawals.publicId, options.cursor),
        columns: { createdAt: true }
      });
      if (cursorRow) {
        conditions.push(lt(withdrawals.createdAt, cursorRow.createdAt));
      }
    }
    const rows = await this.db.query.withdrawals.findMany({
      where: and(...conditions),
      orderBy: [desc(withdrawals.createdAt)],
      limit: limit + 1
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((r) => this.toDomain(r));
    const nextCursor = hasMore ? page[page.length - 1].publicId : void 0;
    return { items, cursor: nextCursor };
  }
  async save(withdrawal) {
    await this.db.insert(withdrawals).values(this.toRow(withdrawal));
  }
  async update(withdrawal) {
    await this.db.update(withdrawals).set({
      status: withdrawal.status,
      actualAmount: withdrawal.actualAmount != null ? String(withdrawal.actualAmount) : null,
      fee: withdrawal.fee != null ? String(withdrawal.fee) : null,
      redeemTxHash: withdrawal.redeemTxHash,
      bridgeTxHash: withdrawal.bridgeTxHash,
      destinationTxHash: withdrawal.destinationTxHash,
      errorMessage: withdrawal.errorMessage,
      updatedAt: withdrawal.updatedAt,
      completedAt: withdrawal.completedAt
    }).where(eq(withdrawals.id, withdrawal.id));
  }
  toRow(withdrawal) {
    return {
      id: withdrawal.id,
      publicId: withdrawal.publicId,
      userId: withdrawal.userId,
      walletId: withdrawal.walletId,
      escrowIds: withdrawal.escrowIds,
      destinationChain: withdrawal.destinationChain,
      destinationDomain: withdrawal.destinationDomain,
      recipientAddress: withdrawal.recipientAddress,
      status: withdrawal.status,
      estimatedAmount: String(withdrawal.estimatedAmount),
      walletProvider: withdrawal.walletProvider,
      actualAmount: withdrawal.actualAmount != null ? String(withdrawal.actualAmount) : null,
      fee: withdrawal.fee != null ? String(withdrawal.fee) : null,
      redeemTxHash: withdrawal.redeemTxHash,
      bridgeTxHash: withdrawal.bridgeTxHash,
      destinationTxHash: withdrawal.destinationTxHash,
      errorMessage: withdrawal.errorMessage,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      completedAt: withdrawal.completedAt
    };
  }
  toDomain(row) {
    return new Withdrawal({
      id: row.id,
      publicId: row.publicId,
      userId: row.userId,
      walletId: row.walletId,
      escrowIds: row.escrowIds,
      destinationChain: row.destinationChain,
      destinationDomain: row.destinationDomain,
      recipientAddress: row.recipientAddress,
      status: row.status,
      estimatedAmount: Number(row.estimatedAmount),
      walletProvider: row.walletProvider,
      actualAmount: row.actualAmount != null ? Number(row.actualAmount) : void 0,
      fee: row.fee != null ? Number(row.fee) : void 0,
      redeemTxHash: row.redeemTxHash ?? void 0,
      bridgeTxHash: row.bridgeTxHash ?? void 0,
      destinationTxHash: row.destinationTxHash ?? void 0,
      errorMessage: row.errorMessage ?? void 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? void 0
    });
  }
};
export {
  PgWithdrawalRepository
};
//# sourceMappingURL=pg-withdrawal.repository.js.map