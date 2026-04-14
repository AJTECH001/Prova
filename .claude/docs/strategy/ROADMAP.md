---
role: strategy
depends-on: [BUSINESS_MODEL.md]
triggers: [phase change, priority shift]
last-reviewed: 2026-04-14
---

# Roadmap — PROVA

## Current Phase: 1 — Testnet MVP (Building)

## Priorities

1. Complete backend pool management endpoints (`/pool/*`)
2. Frontend integration with backend API (React/Vite app)
3. End-to-end escrow + insurance flow on Arbitrum Sepolia testnet
4. Recruit 10-20 testnet exporters for validation

## Phase Plan

### Phase 1: Testnet MVP (current)

- [x] Clean architecture backend: auth, escrows, withdrawals, credit score, webhooks
- [x] PostgreSQL + memory repositories
- [x] SIWE wallet login + JWT
- [x] FHE credit score computation (CoFHE worker)
- [x] Webhook listener (QuickNode + relay-callback)
- [ ] Pool management API (`/pool/create`, `/pool/stake`, `/pool/unstake`, `/pool/status`)
- [ ] Frontend ↔ backend integration (existing React/Vite app)
- [ ] End-to-end testnet demo: exporter creates invoice → buys coverage → buyer pays → settles
- [ ] 10+ testnet users, resolver + policy tested on Arbitrum Sepolia

### Phase 2: Mainnet Launch

- Smart contract audit (ProvaPaymentResolver + ProvaUnderwriterPolicy)
- Mainnet deployment (Arbitrum One)
- Real USDC transactions
- First 100 exporter users
- KYB flow for exporters (business profile → compliance)

### Phase 3: Growth & Partnerships

- Community at scale (exporters + LPs)
- Integration with trade finance platforms
- Cross-chain expansion via CCTP v2
- API / white-label offering for banks and fintechs

## Go/No-Go Gates

| Gate        | Criteria                                                         | Status      |
| ----------- | ---------------------------------------------------------------- | ----------- |
| Phase 1 → 2 | 10+ testnet users, escrow+insurance flow tested, audit scheduled | Not started |
| Phase 2 → 3 | 100+ users, positive unit economics, no critical bugs            | Not started |
