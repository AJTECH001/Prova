---
role: product
depends-on: []
triggers: [new integration, protocol update, resolver change]
last-reviewed: 2026-03-20
---

# Protocol Integration — {venture_name}

## Primitives Used

| Primitive             | Used     | Purpose      |
| --------------------- | -------- | ------------ |
| ConfidentialEscrow    | {yes/no} | {from brief} |
| CoverageManager       | {yes/no} | {from brief} |
| PoolFactory           | {yes/no} | {from brief} |
| CCTP v2 (cross-chain) | {yes/no} | {from brief} |
| Meta-transactions     | {yes/no} | Gasless UX   |

## Contract Addresses

**Do not hardcode.** Query addresses from the ReineiraOS MCP server or see `CLAUDE.md`.

Key contracts to reference:

- ConfidentialEscrow — core escrow engine (IFHERC20, token-agnostic)
- CoverageManager — insurance coverage
- PolicyRegistry — underwriter policy registration
- PoolFactory — insurance pool creation
- TrustedForwarder — ERC-2771 meta-transactions
- Reclaim Verifier — zkTLS proof verification
- Chainlink feeds — price oracle data
- UMA Optimistic Oracle — dispute/outcome resolution

## Protocol Flow

```
1. {User action — from brief}
2. Frontend encrypts amount via cofhejs
3. ConfidentialEscrow.create(resolver, resolverData, encryptedAmount)
   → resolver.onConditionSet(escrowId, resolverData) fires atomically
4. {Condition trigger — from brief}
5. resolver.isConditionMet(escrowId) returns true
6. ConfidentialEscrow.redeem(escrowId) releases funds
7. {Post-settlement — from brief}
```

## Resolver Design

- **Name:** {venture_name}ConditionResolver
- **Type:** {zkTLS / oracle / UMA / multi-sig / time lock}
- **Condition:** {from brief — what must be true}
- **Storage:** {config struct fields}
- **Implementation:** See `reineira-code/contracts/resolvers/`

## SDK Integration

```typescript
import { ReineiraSDK } from '@reineira-os/sdk';

const sdk = ReineiraSDK.create({ network: 'testnet', privateKey: process.env.PRIVATE_KEY });
await sdk.initialize();

const escrow = await sdk.escrow
  .build()
  .amount(sdk.stablecoin(1000)) // token-agnostic — works with any supported stablecoin
  .owner('0xRecipient...')
  .condition('0xResolver...', resolverData)
  .create();
```

## Testing

```bash
# In reineira-code
npm install --legacy-peer-deps
npx hardhat test test/resolvers/{venture_name}.test.ts
```
