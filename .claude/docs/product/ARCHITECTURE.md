---
role: product
depends-on: []
triggers: [stack change, new service, new integration]
last-reviewed: 2026-04-14
---

# Architecture — PROVA

## Repos

| Repo                    | Stack                                              | Purpose                        |
| ----------------------- | -------------------------------------------------- | ------------------------------ |
| PROVA/backend           | TypeScript + Clean Architecture (Vercel-ready)     | Backend API                    |
| PROVA/app               | React 19 + Vite + TanStack Router + Tailwind       | Frontend (pre-existing)        |
| PROVA/contracts         | Solidity + Hardhat + cofhejs                       | ProvaPaymentResolver + Policy  |

## Tech Stack

| Layer             | Technology                                          | Purpose                     |
| ----------------- | --------------------------------------------------- | --------------------------- |
| Contracts         | Solidity ^0.8.24 + Hardhat + cofhejs                | Resolver + policy plugins   |
| Frontend          | React 19 + TypeScript + Vite + TanStack Router      | Exporter / LP UI            |
| Backend           | TypeScript + Clean Architecture (Drizzle + PG)      | API + business logic        |
| Auth              | SIWE → JWT (access 1h + refresh 30d)                | Wallet-based login          |
| Wallet            | ZeroDev ERC-4337 smart wallet (passkeys)            | User transactions           |
| Encryption        | Fhenix CoFHE (FHE) via FHE Worker service           | On-chain encrypted values   |
| DB                | PostgreSQL (Neon via Vercel) + memory fallback      | Persistence                 |
| Events            | QuickNode webhooks + relay-callback                 | On-chain event listeners    |
| Deploy            | Vercel serverless                                   | API + frontend hosting      |

## Backend Domain Structure

```
backend/
├── api/v1/                  ← Vercel route handlers
│   ├── auth/wallet/         ← SIWE nonce + verify
│   ├── auth/tokens/         ← refresh, logout
│   ├── users/me             ← current user
│   ├── business-profiles/   ← KYB profile
│   ├── credit-score/        ← FHE credit score
│   ├── escrows/             ← create + list escrows
│   ├── public/escrows/      ← buyer-facing public view
│   ├── transactions/        ← report on-chain tx hash
│   ├── withdrawals/         ← settlement withdrawals
│   ├── pool/                ← pool management (LP + admin) [WIP]
│   ├── balance/             ← cUSDC wallet balance
│   └── webhooks/            ← QuickNode + relay events
│
└── src/
    ├── domain/              ← Models, repository interfaces
    ├── application/         ← Use cases, DTOs
    ├── infrastructure/      ← Repos (memory + postgres), FHE, auth
    ├── interface/           ← Handler factory, auth middleware
    └── core/                ← Config, errors, logger, validator
```

## System Diagram

```
Exporter (ZeroDev AA) → React App → Backend API (Vercel)
                                          ↓
                                   Use Cases / DTOs
                                          ↓
                              FHE Worker (CoFHE encrypt)
                                          ↓
                              ConfidentialEscrow + CoverageManager
                                    (Arbitrum Sepolia)
                                          ↑
                              QuickNode Webhook Events
```

## Data Entities

| Entity          | Description                           | Key Fields                                      |
| --------------- | ------------------------------------- | ----------------------------------------------- |
| User            | Wallet-based identity                 | walletAddress, walletProvider                   |
| Escrow          | FHE-encrypted invoice escrow          | publicId, onChainEscrowId, status, txHash       |
| Withdrawal      | Escrow settlement withdrawal          | escrowId, status, txHash                        |
| BusinessProfile | KYB company info                      | companyName, country, kybStatus                 |
| CreditScore     | FHE risk assessment                   | rawScore, paymentRate, avgDsoDays               |
| PoolStake       | LP stake in insurance pool            | userId, poolAddress, amount, status             |

## Running Locally

```bash
# Backend (dev server)
cd PROVA/backend && pnpm dev

# FHE Worker (required for credit score + escrow encryption)
# See FHE_WORKER_URL in .env.example

# Frontend
cd PROVA/app && pnpm dev
```
