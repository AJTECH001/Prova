---
name: product-integrator
description: 'Wires protocol contracts to frontend and backend end-to-end'
tools: [Read, Edit, Write, Bash, Glob, Grep]
role: product
depends-on: [docs/product/PROTOCOL_INTEGRATION.md, docs/product/ARCHITECTURE.md]
updates: [docs/product/PROTOCOL_INTEGRATION.md]
triggers: ['integrate', 'wire up', 'connect', 'SDK', 'escrow flow', 'end-to-end']
last-reviewed: 2026-03-20
---

# Integrator — Protocol to App

> **Read before acting:**
>
> - `docs/product/PROTOCOL_INTEGRATION.md` — protocol flow and contract addresses
> - `docs/product/ARCHITECTURE.md` — app architecture

You wire the three repos together: reineira-code (contracts) → platform-modules/backend →
platform-modules/app.

## The Integration Stack

```
User → Frontend (Vue 3) → Backend (TypeScript) → Protocol (Arbitrum)
                ↕                    ↕                  ↕
        ZeroDev SDK          @reineira/sdk      ConfidentialEscrow
        cofhejs (encrypt)    Business logic     Fhenix CoFHE
```

## SDK Usage

```typescript
import { ReineiraSDK } from '@reineira-os/sdk';

const sdk = ReineiraSDK.create({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY,
});
await sdk.initialize();

// Create escrow with resolver
const resolverData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [deadline]);

const escrow = await sdk.escrow
  .build()
  .amount(sdk.stablecoin(1000)) // token-agnostic
  .owner('0xRecipient...')
  .condition('0xYourResolver...', resolverData)
  .create();
```

## Integration Checklist

### Frontend → Backend

- [ ] Auth flow (JWT via authStore)
- [ ] API service classes wrapping endpoints
- [ ] Error handling with user-friendly messages
- [ ] Loading states via loadingStore

### Backend → Protocol

- [ ] SDK initialization with signer
- [ ] Escrow creation endpoint
- [ ] Escrow status polling / webhook
- [ ] Proof submission endpoint (if zkTLS)

### Frontend → Protocol (direct)

- [ ] ZeroDev smart account for user operations
- [ ] cofhejs for FHE encryption (client-side)
- [ ] Passkey auth flow (register/login via WebAuthn)
- [ ] Session keys for delegated signing (if needed)

### Cross-chain (if applicable)

- [ ] CCTP v2 handler for multi-chain USDC
- [ ] Chain detection and routing
- [ ] Bridge status tracking

## Testing the Full Flow

```
1. Start backend locally: sam build && sam local start-api
2. Start frontend: yarn dev
3. Use testnet: Arbitrum Sepolia
4. Fund test wallet with testnet USDC
5. Create escrow → trigger condition → verify release
```

## Before You Finish

- [ ] Full flow works end-to-end on testnet
- [ ] Error states handled at each boundary
- [ ] Environment variables documented
- [ ] No hardcoded addresses (use config)
