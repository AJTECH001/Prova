---
role: system
depends-on: []
updates: [agents/_dispatch.md]
triggers: [phase change, convention update, new agent type, key metric shift]
last-reviewed: 2026-04-14
---

# PROVA — System Configuration

> Master configuration. Loaded FIRST on every Claude Code invocation. Last updated: 2026-04-14

---

## Phase

**PHASE: 1 — Testnet MVP (Building)**

Backend API complete. Frontend integration in progress. Target: end-to-end escrow + insurance flow on Arbitrum Sepolia.

---

## 1. Project Identity

**PROVA** is a trade credit insurance platform for SME exporters on Arbitrum Sepolia.

Exporters create on-chain FHE-encrypted escrows for invoices. Underwriters evaluate buyer credit risk using FHE-encrypted scoring. LPs stake USDC into insurance pools and earn premiums.

_Built on ReineiraOS: ConfidentialEscrow + ConfidentialCoverageManager + PoolFactory + PolicyRegistry._

### The Ecosystem

| Repo               | Role                                                      |
| ------------------ | --------------------------------------------------------- |
| **PROVA** (this)   | API backend + startup OS                                  |
| **reineira-code**  | ProvaPaymentResolver + ProvaUnderwriterPolicy (deployed)  |
| **platform-modules** | App starter — frontend uses existing React/Vite app     |

### Plugin Contracts (Arbitrum Sepolia — deployed)

| Contract                  | Address (from .env)     | Role                                           |
| ------------------------- | ----------------------- | ---------------------------------------------- |
| ProvaPaymentResolver      | `RESOLVER_ADDRESS`      | IConditionResolver — releases at dueDate       |
| ProvaUnderwriterPolicy    | `POLICY_ADDRESS`        | IUnderwriterPolicy — FHE credit score → premium|

### Protocol Addresses (baked into SDK)

| Contract                    | Address                                      |
| --------------------------- | -------------------------------------------- |
| ConfidentialEscrow          | `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa` |
| ConfidentialCoverageManager | `0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6` |
| PoolFactory                 | `0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD` |
| PolicyRegistry              | `0xf421363B642315BD3555dE2d9BD566b7f9213c8E` |
| cUSDC                       | `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` |
| USDC                        | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

---

## 2. Architecture

```
PROVA/
├── backend/          ← TypeScript clean architecture API (domain/app/infra/interface)
├── app/              ← React/Vite frontend (pre-existing, not generated)
├── contracts/        ← Solidity plugin contracts (pre-existing)
└── .claude/          ← Startup OS (docs, agents, skills, data)
```

### Loading Order

```
1. SYSTEM.md        → Phase, conventions
2. CLAUDE.md        → (atlas reference)
3. Agent file       → Role definition, playbook
4. Docs             → Agent's depends-on list
5. Execute          → Do the work
6. Log              → Update SPRINT_LOG / data/ if strategic
```

---

## 3. Conventions

| Type   | Convention             | Example                      |
| ------ | ---------------------- | ---------------------------- |
| Docs   | SCREAMING_SNAKE.md     | docs/strategy/TOKENOMICS.md  |
| Agents | {domain}-{role}.md     | protocol-resolver.md         |
| Data   | YYYY-MM-DD.md          | data/decisions/2026-04-14.md |

---

## 4. Current Key Numbers

| Metric           | Value                          | Source         |
| ---------------- | ------------------------------ | -------------- |
| Stage            | Building Testnet MVP           | brief.md       |
| Blueprint        | B2B Trade Credit Insurance     | brief.md       |
| Chain            | Arbitrum Sepolia               | brief.md       |
| Protocol         | ReineiraOS (ConfidentialEscrow + CoverageManager) | CLAUDE.md |
| Encryption       | Fhenix CoFHE (FHE)             | brief.md       |
| Auth             | SIWE → JWT (access + refresh)  | brief.md       |
| Wallet           | ZeroDev ERC-4337 smart wallet  | brief.md       |
| DB               | PostgreSQL (Drizzle ORM)       | brief.md       |
| Deploy           | Vercel serverless              | brief.md       |

---

## 5. Data Flow Rules

### Before Any Recommendation

Every strategic agent MUST:
1. Check `docs/intelligence/METRICS.md` for current KPI state
2. Reference protocol context (contract addresses, FHE constraints)
3. Verify against current roadmap and decision framework

### After Any Strategic Change

1. Update relevant doc
2. Log to `data/decisions/YYYY-MM-DD.md`
3. Update `docs/execution/SPRINT_LOG.md` if task-related
