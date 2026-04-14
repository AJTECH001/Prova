---
role: execution
depends-on: [SPRINT_LOG.md, ROADMAP.md]
triggers: [new action item, item completed]
last-reviewed: 2026-04-14
---

# Action Items — PROVA

## Open

| #  | Item                                                      | Priority | Owner    | Status      |
| -- | --------------------------------------------------------- | -------- | -------- | ----------- |
| 1  | Frontend ↔ backend integration (React app ↔ API)          | Critical | Dev      | Not started |
| 2  | End-to-end testnet demo: escrow → coverage → settle       | Critical | Dev      | Not started |
| 3  | FHE worker deployment (required for credit score + escrow)| Critical | Infra    | Not started |
| 4  | PostgreSQL schema migration (pool_stakes table)           | High     | Dev      | Not started |
| 5  | QuickNode webhook setup (Arbitrum Sepolia, testnet)       | High     | Dev      | Not started |
| 6  | Pool creation on testnet (POOL_ADDRESS via PoolFactory)   | High     | Dev      | Not started |
| 7  | Recruit 10-20 testnet exporter users                      | High     | Growth   | Not started |
| 8  | Smart contract audit scheduling                           | Medium   | Legal    | Not started |
| 9  | KYB flow validation (business profile + compliance)       | Medium   | Legal    | Not started |
| 10 | .env.example → .env setup for staging environment        | Medium   | Infra    | Not started |

## Closed

| #  | Item                                        | Completed  |
| -- | ------------------------------------------- | ---------- |
| —  | Backend auth, escrow, withdrawal, webhooks  | 2026-03-20 |
| —  | Pool management API module                  | 2026-04-14 |
| —  | OS docs populated from brief.md             | 2026-04-14 |
