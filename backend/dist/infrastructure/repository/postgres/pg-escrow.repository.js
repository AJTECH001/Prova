// src/infrastructure/repository/postgres/pg-escrow.repository.ts
import { and, eq, lt, desc } from "drizzle-orm";

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

// src/infrastructure/repository/postgres/pg-escrow.repository.ts
var PgEscrowRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.escrows.findFirst({
      where: eq(escrows.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByPublicId(publicId) {
    const row = await this.db.query.escrows.findFirst({
      where: eq(escrows.publicId, publicId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId, options) {
    const limit = options?.limit ?? 20;
    const conditions = [eq(escrows.userId, userId)];
    if (options?.status) {
      conditions.push(eq(escrows.status, options.status));
    }
    if (options?.cursor) {
      const cursorRow = await this.db.query.escrows.findFirst({
        where: eq(escrows.publicId, options.cursor),
        columns: { createdAt: true }
      });
      if (cursorRow) {
        conditions.push(lt(escrows.createdAt, cursorRow.createdAt));
      }
    }
    const rows = await this.db.query.escrows.findMany({
      where: and(...conditions),
      orderBy: [desc(escrows.createdAt)],
      limit: limit + 1
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((r) => this.toDomain(r));
    const nextCursor = hasMore ? page[page.length - 1].publicId : void 0;
    return { items, cursor: nextCursor };
  }
  async findByTxHash(txHash) {
    const row = await this.db.query.escrows.findFirst({
      where: eq(escrows.txHash, txHash)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByOnChainId(onChainId) {
    const row = await this.db.query.escrows.findFirst({
      where: eq(escrows.onChainEscrowId, onChainId)
    });
    return row ? this.toDomain(row) : null;
  }
  async save(escrow) {
    await this.db.insert(escrows).values(this.toRow(escrow));
  }
  async update(escrow) {
    await this.db.update(escrows).set({
      status: escrow.status,
      onChainEscrowId: escrow.onChainEscrowId,
      txHash: escrow.txHash,
      metadata: escrow.metadata
    }).where(eq(escrows.id, escrow.id));
  }
  toRow(escrow) {
    return {
      id: escrow.id,
      publicId: escrow.publicId,
      userId: escrow.userId,
      type: escrow.type,
      counterparty: escrow.counterparty,
      deadline: escrow.deadline,
      externalReference: escrow.externalReference,
      amount: String(escrow.amount),
      currencyType: escrow.currency.type,
      currencyCode: escrow.currency.code,
      status: escrow.status,
      walletId: escrow.walletId,
      metadata: escrow.metadata,
      onChainEscrowId: escrow.onChainEscrowId,
      txHash: escrow.txHash,
      createdAt: escrow.createdAt
    };
  }
  toDomain(row) {
    return new Escrow({
      id: row.id,
      publicId: row.publicId,
      userId: row.userId,
      type: row.type,
      counterparty: row.counterparty ?? void 0,
      deadline: row.deadline ?? void 0,
      externalReference: row.externalReference ?? void 0,
      amount: Number(row.amount),
      currency: new Currency({
        type: row.currencyType,
        code: row.currencyCode
      }),
      status: row.status,
      walletId: row.walletId,
      metadata: row.metadata ?? void 0,
      onChainEscrowId: row.onChainEscrowId ?? void 0,
      txHash: row.txHash ?? void 0,
      createdAt: row.createdAt
    });
  }
};
export {
  PgEscrowRepository
};
//# sourceMappingURL=pg-escrow.repository.js.map