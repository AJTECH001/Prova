# PROVA — brief.md

## What we're building

PROVA is a trade credit insurance platform for SME exporters on Arbitrum Sepolia.
Exporters create on-chain escrows for invoices. Underwriters evaluate buyer credit risk
using FHE-encrypted scoring. Liquidity providers stake USDC into insurance pools and
earn premiums. All financial values (risk scores, coverage amounts, premiums) are
FHE-encrypted on-chain via CoFHE.

**Skip the frontend — generate backend only.**
We have a working React/Vite frontend already. We need the API and on-chain integration layer.

---

## Stack

- **Chain:** Arbitrum Sepolia
- **Protocol:** ReineiraOS (ConfidentialEscrow, ConfidentialCoverageManager, PoolFactory, PolicyRegistry)
- **FHE:** CoFHE via @fhenixprotocol/cofhe-contracts (euint64, ebool)
- **Auth:** Wallet-based — SIWE nonce → verify → JWT (access + refresh tokens)
- **AA:** ZeroDev (ERC-4337) — users interact via smart wallets, not EOAs
- **Backend runtime:** Node.js / TypeScript, clean architecture (domain / application / infrastructure / interface)
- **Database:** PostgreSQL
- **Deployment:** AWS SAM (serverless) or Vercel serverless functions

---

## Plugin contracts (already deployed — do not regenerate)

| Contract | Role |
|---|---|
| `ProvaPaymentResolver` | `IConditionResolver` — releases escrow when `block.timestamp >= dueDate` |
| `ProvaUnderwriterPolicy` | `IUnderwriterPolicy` — FHE credit score → encrypted risk premium (euint64) |

These are deployed to Arbitrum Sepolia. Their addresses come from `.env`.

---

## Reineira platform addresses (Arbitrum Sepolia, baked into SDK)

| Contract | Address |
|---|---|
| ConfidentialEscrow | `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa` |
| ConfidentialCoverageManager | `0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6` |
| PoolFactory | `0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD` |
| PolicyRegistry | `0xf421363B642315BD3555dE2d9BD566b7f9213c8E` |
| cUSDC | `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

---

## User roles

### Exporter (primary user)
- Connects wallet (ZeroDev AA smart wallet)
- Creates invoices as on-chain escrows (amount, buyer wallet, due date)
- Purchases insurance coverage for each escrow (pool + policy)
- Monitors escrow status (pending → funded → settled/expired)
- Files insurance disputes if buyer defaults
- Withdraws settled funds

### Buyer (counterparty — external, may not have the app)
- Funds escrows before due date
- Can be notified via webhook/email when an escrow is created for them

### Liquidity Provider (LP)
- Stakes USDC into the insurance pool
- Earns premium yield as coverage is purchased
- Unstakes when desired

---

## Core flows to implement

### 1. Auth — wallet login
```
POST /auth/nonce        { wallet_address } → { nonce, message }
POST /auth/verify       { wallet_address, signature } → { access_token, refresh_token }
POST /auth/refresh      { refresh_token } → { access_token }
POST /auth/logout
GET  /users/me
```

### 2. Business profile (KYB)
```
POST /business-profile  { company_name, country, registration_number, ... }
GET  /business-profile
```

### 3. Credit score (FHE)
The backend computes a credit score (0–1000) from the exporter's on-chain escrow history:
- Payment rate, days-sales-outstanding, volume, default rate, tenure
- Score is FHE-encrypted via CoFHE SDK (euint32 wire format → InEuint32)
- Encrypted score becomes `riskProof` passed to `ProvaUnderwriterPolicy.evaluateRisk()`

```
GET  /credit-score      → { raw_score, encrypted_proof }
```

### 4. Escrow (transaction) lifecycle
```
POST /transactions                 create escrow — save to DB, return contract call params
GET  /transactions                 list user's escrows (paginated)
GET  /transactions/:id             get single escrow with status
GET  /transactions/public/:public_id  public escrow view (for buyer link)
POST /transactions/:id/report      report on-chain tx hash after client signs
```

**Create escrow flow:**
1. Frontend posts invoice details (amount, currency, buyer_wallet, due_date)
2. Backend saves escrow to DB (status: PENDING)
3. Backend returns `contract_address`, ABI function signature, ABI params
4. Frontend signs + submits to chain (ZeroDev AA)
5. Frontend reports tx hash → backend watches for EscrowCreated event
6. Backend updates escrow status to ACTIVE, stores on-chain escrow ID

**Escrow create params for `sdk.escrow.create()`:**
```typescript
{
  amount: sdk.usdc(invoiceAmount),
  owner: exporterWallet,
  resolver: process.env.RESOLVER_ADDRESS,
  resolverData: abi.encode(buyer, amount, dueDate),
  insurance: {
    pool: process.env.POOL_ADDRESS,
    policy: process.env.POLICY_ADDRESS,
    coverageAmount: sdk.usdc(invoiceAmount),
    expiry: dueDate + 30 days,
  }
}
```

### 5. Insurance pool management (admin / LP endpoints)
```
POST /pool/create              create pool via PoolFactory (admin)
POST /pool/policy/:address     add policy to pool (admin)
POST /pool/stake               LP stakes USDC
POST /pool/unstake/:stake_id   LP unstakes
GET  /pool/status              pool balance, total staked, premiums earned
```

### 6. Withdrawals (escrow settlement / claim payout)
```
POST /withdrawals              initiate withdrawal for a settled escrow
GET  /withdrawals              list user's withdrawals
GET  /withdrawals/:id          single withdrawal status
POST /withdrawals/:id/report   report on-chain tx hash
```

### 7. Webhooks (on-chain event listeners)
Listen for Reineira contract events and update DB:
- `EscrowCreated(escrowId)` → link on-chain ID to DB record
- `EscrowFunded(escrowId, payer)` → update status to FUNDED
- `EscrowRedeemed(escrowId)` → update status to SETTLED
- `CoverageCreated(coverageId, escrowId)` → attach coverage to escrow record
- `PremiumPaid(coverageId, amount)` → record premium

```
POST /webhooks/escrow          process on-chain escrow events
POST /webhooks/coverage        process on-chain coverage events
```

### 8. Balance
```
GET  /balance                  cUSDC balance for the connected wallet
```

---

## Domain models

### Escrow
```
id, public_id, user_id, on_chain_id, type (pay/receive),
counterparty_wallet, amount, currency, deadline, due_date,
status (PENDING|ACTIVE|FUNDED|SETTLED|EXPIRED|FAILED),
resolver_address, pool_address, policy_address, coverage_id,
tx_hash, metadata, created_at, settled_at
```

### CreditScore
```
user_id, raw_score (0-1000), payment_rate, avg_dso_days,
total_volume, default_rate, tenure_escrows, computed_at
```

### Withdrawal
```
id, public_id, user_id, escrow_id, on_chain_escrow_id,
amount, currency, status (PENDING|PROCESSING|COMPLETED|FAILED),
tx_hash, created_at, completed_at
```

### BusinessProfile
```
user_id, company_name, country, registration_number,
kyb_status (PENDING|APPROVED|REJECTED), created_at
```

---

## Environment variables needed

```env
# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Chain
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=0x...          # backend operator key (for pool mgmt, webhooks)

# Plugin contracts (deployed by us)
RESOLVER_ADDRESS=0x...
POLICY_ADDRESS=0x...
POOL_ADDRESS=0x...         # created after deploy via PoolFactory

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://prova.xyz

# DB
DATABASE_URL=postgresql://...
```

---

## What to generate

- Clean architecture backend (domain / application / infrastructure / interface layers)
- All endpoints listed above, with request validation and typed responses
- Reineira SDK integration (escrow create, pool create, stake, event listeners)
- FHE credit score computation + CoFHE encryption service
- ZeroDev AA wallet adapter (for backend-initiated transactions if needed)
- PostgreSQL schema + migrations for all domain models
- Webhook listener service for Reineira contract events
- JWT auth middleware
- Unit tests for use cases, integration tests for API endpoints
- `.env.example` with all required variables
- Deployment config (AWS SAM or Vercel)

## What NOT to generate

- Frontend (we have React/Vite/TanStack Router already)
- Smart contracts (ProvaPaymentResolver and ProvaUnderwriterPolicy already written)
- Hardhat config (in the `contracts/` folder already)
