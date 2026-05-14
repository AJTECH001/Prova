// src/infrastructure/repository/postgres/pg-user.repository.ts
import { eq } from "drizzle-orm";

// src/domain/auth/model/user.ts
var User = class _User {
  id;
  walletAddress;
  walletProvider;
  email;
  role;
  createdAt;
  constructor(params) {
    this.id = params.id;
    this.walletAddress = params.walletAddress;
    this.walletProvider = params.walletProvider;
    this.email = params.email;
    this.role = params.role;
    this.createdAt = params.createdAt;
  }
  withRole(role) {
    return new _User({ ...this, role });
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
  "FUNDED",
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
var kybStatusEnum = pgEnum("kyb_status", ["PENDING", "APPROVED", "REJECTED"]);
var userRoleEnum = pgEnum("user_role", ["SELLER", "BUYER", "LP", "ADMIN"]);
var credentialStatusEnum = pgEnum("credential_status", [
  "active",
  "revoked"
]);
var escrowEventTypeEnum = pgEnum("escrow_event_type", [
  "EscrowCreated",
  "EscrowFunded",
  "EscrowSettled",
  "EscrowRedeemed"
]);
var users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    walletAddress: text("wallet_address").unique().notNull(),
    walletProvider: walletProviderEnum("wallet_provider").notNull(),
    email: text("email"),
    role: userRoleEnum("role"),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    settledAt: timestamp("settled_at"),
    resolverAddress: text("resolver_address"),
    poolAddress: text("pool_address"),
    policyAddress: text("policy_address"),
    coverageId: text("coverage_id")
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
    taxId: text("tax_id"),
    country: text("country"),
    registrationNumber: text("registration_number"),
    kybStatus: kybStatusEnum("kyb_status").notNull().default("PENDING")
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
var poolStakeStatusEnum = pgEnum("pool_stake_status", [
  "PENDING",
  "ACTIVE",
  "UNSTAKING",
  "WITHDRAWN",
  "FAILED"
]);
var poolStakes = pgTable(
  "pool_stakes",
  {
    id: text("id").primaryKey(),
    publicId: text("public_id").unique().notNull(),
    userId: text("user_id").references(() => users.id).notNull(),
    poolAddress: text("pool_address").notNull(),
    amount: numeric("amount").notNull(),
    status: poolStakeStatusEnum("status").notNull().default("PENDING"),
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at")
  },
  (t) => [
    index("pool_stakes_public_id_idx").on(t.publicId),
    index("pool_stakes_user_id_idx").on(t.userId),
    index("pool_stakes_pool_address_idx").on(t.poolAddress)
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

// src/infrastructure/repository/postgres/pg-user.repository.ts
var PgUserRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByWalletAddress(address) {
    const row = await this.db.query.users.findFirst({
      where: eq(users.walletAddress, address)
    });
    return row ? this.toDomain(row) : null;
  }
  async save(user) {
    await this.db.insert(users).values({
      id: user.id,
      walletAddress: user.walletAddress,
      walletProvider: user.walletProvider,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }).onConflictDoUpdate({
      target: users.walletAddress,
      set: {
        walletProvider: user.walletProvider,
        email: user.email,
        role: user.role
      }
    });
  }
  async updateRole(userId, role) {
    await this.db.update(users).set({ role }).where(eq(users.id, userId));
  }
  toDomain(row) {
    return new User({
      id: row.id,
      walletAddress: row.walletAddress,
      walletProvider: row.walletProvider,
      email: row.email ?? void 0,
      role: row.role ?? void 0,
      createdAt: row.createdAt
    });
  }
};

// src/infrastructure/repository/postgres/pg-session.repository.ts
import { eq as eq2 } from "drizzle-orm";

// src/domain/auth/model/session.ts
var Session = class {
  id;
  userId;
  refreshToken;
  expiresAt;
  createdAt;
  userAgent;
  ipAddress;
  constructor(params) {
    this.id = params.id;
    this.userId = params.userId;
    this.refreshToken = params.refreshToken;
    this.expiresAt = params.expiresAt;
    this.createdAt = params.createdAt;
    this.userAgent = params.userAgent;
    this.ipAddress = params.ipAddress;
  }
  isExpired() {
    return this.expiresAt < /* @__PURE__ */ new Date();
  }
  getTtlSeconds() {
    return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1e3));
  }
};

// src/infrastructure/repository/postgres/pg-session.repository.ts
var PgSessionRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.sessions.findFirst({
      where: eq2(sessions.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByRefreshToken(token) {
    const row = await this.db.query.sessions.findFirst({
      where: eq2(sessions.refreshToken, token)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId) {
    const rows = await this.db.query.sessions.findMany({
      where: eq2(sessions.userId, userId)
    });
    return rows.map((r) => this.toDomain(r));
  }
  async save(session) {
    await this.db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress
    });
  }
  async delete(id) {
    await this.db.delete(sessions).where(eq2(sessions.id, id));
  }
  async deleteByUserId(userId) {
    await this.db.delete(sessions).where(eq2(sessions.userId, userId));
  }
  toDomain(row) {
    return new Session({
      id: row.id,
      userId: row.userId,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      userAgent: row.userAgent ?? void 0,
      ipAddress: row.ipAddress ?? void 0
    });
  }
};

// src/infrastructure/repository/postgres/pg-nonce.repository.ts
import { and, eq as eq3 } from "drizzle-orm";
var PgNonceRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async save(walletAddress, nonce, ttlSeconds) {
    const expiresAt = Math.floor(Date.now() / 1e3) + ttlSeconds;
    await this.db.insert(nonces).values({ walletAddress, nonce, expiresAt }).onConflictDoUpdate({
      target: [nonces.walletAddress, nonces.nonce],
      set: { expiresAt }
    });
  }
  async findAndDelete(walletAddress, nonce) {
    const now = Math.floor(Date.now() / 1e3);
    const deleted = await this.db.delete(nonces).where(
      and(eq3(nonces.walletAddress, walletAddress), eq3(nonces.nonce, nonce))
    ).returning();
    if (deleted.length === 0) return false;
    return deleted[0].expiresAt > now;
  }
};

// src/infrastructure/repository/postgres/pg-escrow.repository.ts
import { and as and2, eq as eq4, lt, desc, inArray, sql } from "drizzle-orm";

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

// src/infrastructure/repository/postgres/pg-escrow.repository.ts
var PgEscrowRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.escrows.findFirst({
      where: eq4(escrows.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByPublicId(publicId) {
    const row = await this.db.query.escrows.findFirst({
      where: eq4(escrows.publicId, publicId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId, options) {
    const limit = options?.limit ?? 20;
    const conditions = [eq4(escrows.userId, userId)];
    if (options?.status) {
      conditions.push(eq4(escrows.status, options.status));
    }
    if (options?.cursor) {
      const cursorRow = await this.db.query.escrows.findFirst({
        where: eq4(escrows.publicId, options.cursor),
        columns: { createdAt: true }
      });
      if (cursorRow) {
        conditions.push(lt(escrows.createdAt, cursorRow.createdAt));
      }
    }
    const rows = await this.db.query.escrows.findMany({
      where: and2(...conditions),
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
      where: eq4(escrows.txHash, txHash)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByOnChainId(onChainId) {
    const row = await this.db.query.escrows.findFirst({
      where: eq4(escrows.onChainEscrowId, onChainId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findPayableByCounterparty(walletAddress) {
    const rows = await this.db.query.escrows.findMany({
      where: and2(
        eq4(escrows.counterparty, walletAddress.toLowerCase()),
        eq4(escrows.status, "ON_CHAIN" /* ON_CHAIN */)
      ),
      orderBy: [desc(escrows.createdAt)]
    });
    return rows.map((r) => this.toDomain(r));
  }
  async findPaidByCounterparty(walletAddress) {
    const rows = await this.db.query.escrows.findMany({
      where: and2(
        eq4(escrows.counterparty, walletAddress.toLowerCase()),
        inArray(escrows.status, ["FUNDED" /* FUNDED */, "SETTLED" /* SETTLED */, "REDEEMED" /* REDEEMED */])
      ),
      orderBy: [desc(escrows.createdAt)]
    });
    return rows.map((r) => this.toDomain(r));
  }
  async findSettledByUserId(userId) {
    const rows = await this.db.query.escrows.findMany({
      where: and2(
        eq4(escrows.userId, userId),
        inArray(escrows.status, ["SETTLED", "EXPIRED", "FAILED"])
      ),
      orderBy: [desc(escrows.createdAt)]
    });
    return rows.map((r) => this.toDomain(r));
  }
  async findAll(options) {
    const limit = options?.limit ?? 50;
    const conditions = [];
    if (options?.status) {
      conditions.push(eq4(escrows.status, options.status));
    }
    if (options?.cursor) {
      const cursorRow = await this.db.query.escrows.findFirst({
        where: eq4(escrows.publicId, options.cursor),
        columns: { createdAt: true }
      });
      if (cursorRow) {
        conditions.push(lt(escrows.createdAt, cursorRow.createdAt));
      }
    }
    const rows = await this.db.query.escrows.findMany({
      where: conditions.length > 0 ? and2(...conditions) : void 0,
      orderBy: [desc(escrows.createdAt)],
      limit: limit + 1
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((r) => this.toDomain(r));
    const nextCursor = hasMore ? page[page.length - 1].publicId : void 0;
    return { items, cursor: nextCursor };
  }
  async getGlobalStats() {
    const volumeResult = await this.db.execute(sql`SELECT SUM(CAST(amount AS numeric)) as total FROM escrows WHERE status IN ('FUNDED', 'SETTLED', 'REDEEMED')`);
    const activeResult = await this.db.execute(sql`SELECT COUNT(*) as count FROM escrows WHERE status IN ('PENDING', 'ON_CHAIN', 'PROCESSING')`);
    const settledResult = await this.db.execute(sql`SELECT COUNT(*) as count FROM escrows WHERE status IN ('FUNDED', 'SETTLED', 'REDEEMED')`);
    return {
      totalVolume: Number(volumeResult.rows[0]?.total || 0),
      activeEscrows: Number(activeResult.rows[0]?.count || 0),
      settledEscrows: Number(settledResult.rows[0]?.count || 0)
    };
  }
  async save(escrow) {
    await this.db.insert(escrows).values(this.toRow(escrow));
  }
  async update(escrow) {
    await this.db.update(escrows).set({
      status: escrow.status,
      onChainEscrowId: escrow.onChainEscrowId,
      txHash: escrow.txHash,
      metadata: escrow.metadata,
      settledAt: escrow.settledAt,
      coverageId: escrow.coverageId
    }).where(eq4(escrows.id, escrow.id));
  }
  toRow(escrow) {
    return {
      id: escrow.id,
      publicId: escrow.publicId,
      userId: escrow.userId,
      type: escrow.type,
      counterparty: escrow.counterparty?.toLowerCase(),
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
      createdAt: escrow.createdAt,
      settledAt: escrow.settledAt,
      resolverAddress: escrow.resolverAddress ?? null,
      poolAddress: escrow.poolAddress ?? null,
      policyAddress: escrow.policyAddress ?? null,
      coverageId: escrow.coverageId ?? null
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
      createdAt: row.createdAt,
      settledAt: row.settledAt ?? void 0,
      resolverAddress: row.resolverAddress ?? void 0,
      poolAddress: row.poolAddress ?? void 0,
      policyAddress: row.policyAddress ?? void 0,
      coverageId: row.coverageId ?? void 0
    });
  }
};

// src/infrastructure/repository/postgres/pg-withdrawal.repository.ts
import { and as and3, eq as eq5, lt as lt2, desc as desc2 } from "drizzle-orm";

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

// src/infrastructure/repository/postgres/pg-withdrawal.repository.ts
var PgWithdrawalRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.withdrawals.findFirst({
      where: eq5(withdrawals.id, id)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByPublicId(publicId) {
    const row = await this.db.query.withdrawals.findFirst({
      where: eq5(withdrawals.publicId, publicId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId, options) {
    const limit = options?.limit ?? 20;
    const conditions = [eq5(withdrawals.userId, userId)];
    if (options?.status) {
      conditions.push(eq5(withdrawals.status, options.status));
    }
    if (options?.cursor) {
      const cursorRow = await this.db.query.withdrawals.findFirst({
        where: eq5(withdrawals.publicId, options.cursor),
        columns: { createdAt: true }
      });
      if (cursorRow) {
        conditions.push(lt2(withdrawals.createdAt, cursorRow.createdAt));
      }
    }
    const rows = await this.db.query.withdrawals.findMany({
      where: and3(...conditions),
      orderBy: [desc2(withdrawals.createdAt)],
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
    }).where(eq5(withdrawals.id, withdrawal.id));
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

// src/infrastructure/repository/postgres/pg-business-profile.repository.ts
import { eq as eq6 } from "drizzle-orm";

// src/domain/business-profile/model/business-profile.ts
var BusinessProfile = class {
  id;
  userId;
  businessName;
  businessType;
  businessAddress;
  taxId;
  country;
  registrationNumber;
  kybStatus;
  constructor(params) {
    this.id = params.id;
    this.userId = params.userId;
    this.businessName = params.businessName;
    this.businessType = params.businessType;
    this.businessAddress = params.businessAddress;
    this.taxId = params.taxId;
    this.country = params.country;
    this.registrationNumber = params.registrationNumber;
    this.kybStatus = params.kybStatus ?? "PENDING";
  }
};

// src/infrastructure/repository/postgres/pg-business-profile.repository.ts
var PgBusinessProfileRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findByUserId(userId) {
    const row = await this.db.query.businessProfiles.findFirst({
      where: eq6(businessProfiles.userId, userId)
    });
    return row ? this.toDomain(row) : null;
  }
  async save(profile) {
    await this.db.insert(businessProfiles).values({
      id: profile.id,
      userId: profile.userId,
      businessName: profile.businessName,
      businessType: profile.businessType,
      businessAddress: profile.businessAddress,
      taxId: profile.taxId,
      country: profile.country ?? null,
      registrationNumber: profile.registrationNumber ?? null,
      kybStatus: profile.kybStatus
    }).onConflictDoUpdate({
      target: businessProfiles.userId,
      set: {
        businessName: profile.businessName,
        businessType: profile.businessType,
        businessAddress: profile.businessAddress,
        taxId: profile.taxId,
        country: profile.country ?? null,
        registrationNumber: profile.registrationNumber ?? null
      }
    });
  }
  toDomain(row) {
    return new BusinessProfile({
      id: row.id,
      userId: row.userId,
      businessName: row.businessName,
      businessType: row.businessType,
      businessAddress: row.businessAddress ?? void 0,
      taxId: row.taxId ?? void 0,
      country: row.country ?? void 0,
      registrationNumber: row.registrationNumber ?? void 0,
      kybStatus: row.kybStatus
    });
  }
};

// src/infrastructure/repository/postgres/pg-api-credential.repository.ts
import { eq as eq7 } from "drizzle-orm";

// src/domain/api-credential/model/api-credential.ts
var ApiCredential = class {
  id;
  clientId;
  userId;
  hashedSecret;
  salt;
  status;
  createdAt;
  lastUsedAt;
  constructor(params) {
    this.id = params.id;
    this.clientId = params.clientId;
    this.userId = params.userId;
    this.hashedSecret = params.hashedSecret;
    this.salt = params.salt;
    this.status = params.status;
    this.createdAt = params.createdAt;
    this.lastUsedAt = params.lastUsedAt;
  }
  revoke() {
    this.status = "revoked";
    return this;
  }
  touch() {
    this.lastUsedAt = /* @__PURE__ */ new Date();
    return this;
  }
  isActive() {
    return this.status === "active";
  }
};

// src/infrastructure/repository/postgres/pg-api-credential.repository.ts
var PgApiCredentialRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findByClientId(clientId) {
    const row = await this.db.query.apiCredentials.findFirst({
      where: eq7(apiCredentials.clientId, clientId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId) {
    const rows = await this.db.query.apiCredentials.findMany({
      where: eq7(apiCredentials.userId, userId)
    });
    return rows.map((r) => this.toDomain(r));
  }
  async save(credential) {
    await this.db.insert(apiCredentials).values({
      id: credential.id,
      clientId: credential.clientId,
      userId: credential.userId,
      hashedSecret: credential.hashedSecret,
      salt: credential.salt,
      status: credential.status,
      createdAt: credential.createdAt,
      lastUsedAt: credential.lastUsedAt
    });
  }
  async update(credential) {
    await this.db.update(apiCredentials).set({
      status: credential.status,
      lastUsedAt: credential.lastUsedAt
    }).where(eq7(apiCredentials.id, credential.id));
  }
  toDomain(row) {
    return new ApiCredential({
      id: row.id,
      clientId: row.clientId,
      userId: row.userId,
      hashedSecret: row.hashedSecret,
      salt: row.salt,
      status: row.status,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt ?? void 0
    });
  }
};

// src/infrastructure/repository/postgres/pg-escrow-event.repository.ts
import { eq as eq8 } from "drizzle-orm";

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

// src/infrastructure/repository/postgres/pg-escrow-event.repository.ts
var PgEscrowEventRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findByTxHash(txHash) {
    const row = await this.db.query.escrowEvents.findFirst({
      where: eq8(escrowEvents.txHash, txHash)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByEscrowId(escrowId) {
    const row = await this.db.query.escrowEvents.findFirst({
      where: eq8(escrowEvents.escrowId, escrowId)
    });
    return row ? this.toDomain(row) : null;
  }
  async save(event) {
    await this.db.insert(escrowEvents).values({
      txHash: event.txHash,
      escrowId: event.escrowId,
      eventType: event.eventType,
      blockNumber: event.blockNumber,
      createdAt: event.createdAt,
      ttl: event.ttl,
      messageHash: event.messageHash,
      amount: event.amount
    });
  }
  async delete(txHash) {
    await this.db.delete(escrowEvents).where(eq8(escrowEvents.txHash, txHash));
  }
  toDomain(row) {
    return new EscrowEvent({
      txHash: row.txHash,
      escrowId: row.escrowId,
      eventType: row.eventType,
      blockNumber: row.blockNumber,
      createdAt: row.createdAt,
      ttl: row.ttl,
      messageHash: row.messageHash ?? void 0,
      amount: row.amount ?? void 0
    });
  }
};

// src/infrastructure/repository/postgres/pg-pool-stake.repository.ts
import { eq as eq9 } from "drizzle-orm";

// src/domain/pool/model/pool-stake.ts
var PoolStake = class {
  id;
  publicId;
  userId;
  poolAddress;
  amount;
  status;
  txHash;
  onChainStakeId;
  createdAt;
  withdrawnAt;
  constructor(params) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.userId = params.userId;
    this.poolAddress = params.poolAddress;
    this.amount = params.amount;
    this.status = params.status;
    this.txHash = params.txHash;
    this.onChainStakeId = params.onChainStakeId;
    this.createdAt = params.createdAt;
    this.withdrawnAt = params.withdrawnAt;
  }
  markAsActive() {
    this.status = "ACTIVE" /* ACTIVE */;
    return this;
  }
  markAsUnstaking() {
    this.status = "UNSTAKING" /* UNSTAKING */;
    return this;
  }
  markAsWithdrawn() {
    this.status = "WITHDRAWN" /* WITHDRAWN */;
    this.withdrawnAt = /* @__PURE__ */ new Date();
    return this;
  }
  markAsFailed() {
    this.status = "FAILED" /* FAILED */;
    return this;
  }
};

// src/infrastructure/repository/postgres/pg-pool-stake.repository.ts
var PgPoolStakeRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async findById(id) {
    const row = await this.db.query.poolStakes.findFirst({ where: eq9(poolStakes.id, id) });
    return row ? this.toDomain(row) : null;
  }
  async findByPublicId(publicId) {
    const row = await this.db.query.poolStakes.findFirst({
      where: eq9(poolStakes.publicId, publicId)
    });
    return row ? this.toDomain(row) : null;
  }
  async findByUserId(userId) {
    const rows = await this.db.select().from(poolStakes).where(eq9(poolStakes.userId, userId));
    return rows.map((r) => this.toDomain(r));
  }
  async findByPoolAddress(poolAddress) {
    const rows = await this.db.select().from(poolStakes).where(eq9(poolStakes.poolAddress, poolAddress));
    return rows.map((r) => this.toDomain(r));
  }
  async save(stake) {
    await this.db.insert(poolStakes).values({
      id: stake.id,
      publicId: stake.publicId,
      userId: stake.userId,
      poolAddress: stake.poolAddress,
      amount: stake.amount.toString(),
      status: stake.status,
      txHash: stake.txHash ?? null,
      createdAt: stake.createdAt,
      withdrawnAt: stake.withdrawnAt ?? null
    });
  }
  async update(stake) {
    await this.db.update(poolStakes).set({
      status: stake.status,
      txHash: stake.txHash ?? null,
      withdrawnAt: stake.withdrawnAt ?? null
    }).where(eq9(poolStakes.id, stake.id));
  }
  toDomain(row) {
    return new PoolStake({
      id: row.id,
      publicId: row.publicId,
      userId: row.userId,
      poolAddress: row.poolAddress,
      amount: parseFloat(row.amount),
      status: row.status,
      txHash: row.txHash ?? void 0,
      createdAt: row.createdAt,
      withdrawnAt: row.withdrawnAt ?? void 0
    });
  }
};
export {
  PgApiCredentialRepository,
  PgBusinessProfileRepository,
  PgEscrowEventRepository,
  PgEscrowRepository,
  PgNonceRepository,
  PgPoolStakeRepository,
  PgSessionRepository,
  PgUserRepository,
  PgWithdrawalRepository
};
//# sourceMappingURL=index.js.map