---
role: product
depends-on: []
triggers: [new integration, protocol update, resolver change]
last-reviewed: 2026-04-14
---

# Protocol Integration — PROVA

## Primitives Used

| Primitive             | Used | Purpose                                          |
| --------------------- | ---- | ------------------------------------------------ |
| ConfidentialEscrow    | Yes  | Invoice escrow — FHE-encrypted amount + owner    |
| CoverageManager       | Yes  | Purchase insurance coverage for each escrow      |
| PoolFactory           | Yes  | Create + manage the PROVA insurance pool         |
| PolicyRegistry        | Yes  | Register ProvaUnderwriterPolicy                  |
| CCTP v2 (cross-chain) | No   | Future — Phase 3                                 |
| Meta-transactions     | Yes  | ZeroDev AA — gasless for exporters               |

## Contract Addresses

**Do not hardcode.** Use environment variables:

| Contract                    | Env Var                  | Network          |
| --------------------------- | ------------------------ | ---------------- |
| ConfidentialEscrow          | `ESCROW_CONTRACT_ADDRESS`| Arbitrum Sepolia |
| ProvaPaymentResolver        | `RESOLVER_ADDRESS`       | Arbitrum Sepolia |
| ProvaUnderwriterPolicy      | `POLICY_ADDRESS`         | Arbitrum Sepolia |
| PROVA Insurance Pool        | `POOL_ADDRESS`           | Arbitrum Sepolia |

Protocol addresses (ConfidentialCoverageManager, PoolFactory, PolicyRegistry, cUSDC, USDC) are baked into the ReineiraOS SDK.

## Plugin Contracts

### ProvaPaymentResolver (`IConditionResolver`)

```solidity
function isConditionMet(bytes32 escrowId) external view returns (bool) {
    // returns true when block.timestamp >= dueDate set at creation
}

function onConditionSet(bytes32 escrowId, bytes calldata data) external {
    // data = abi.encode(buyerWallet, invoiceAmount, dueDate)
}
```

**Resolver data** passed at escrow creation:
```typescript
resolverData = abi.encode(buyer_wallet, amount_usdc, due_date_unix)
```

### ProvaUnderwriterPolicy (`IUnderwriterPolicy`)

```solidity
function evaluateRisk(bytes32 escrowId, bytes calldata proof) external returns (euint64) {
    // proof = FHE-encrypted credit score from backend
    // returns encrypted premium rate in bps (e.g. 200 = 2%)
}

function judge(bytes32 coverageId, bytes calldata proof) external returns (ebool) {
    // dispute resolution
}
```

## Escrow Create Flow

```
1. Exporter fills invoice form (amount, buyer_wallet, due_date)
2. Frontend → POST /escrows (backend saves to DB, returns contract call params)
3. Frontend encrypts amount via CoFHE (client-side) or backend encrypts (server-side)
4. Frontend calls ConfidentialEscrow.createEscrow(encAmount, encOwner, resolver, resolverData)
   with ZeroDev AA smart wallet
5. Frontend reports tx hash → POST /transactions/escrows/report
6. QuickNode webhook → EscrowCreated event → backend updates status to ON_CHAIN, stores onChainEscrowId

Insurance purchase (optional, same tx or separate):
7. POST /credit-score → backend computes score, encrypts via FHE worker, returns encrypted_proof
8. Frontend calls CoverageManager.purchaseCoverage(escrowId, poolAddress, policyAddress, encProof)
9. QuickNode webhook → CoverageCreated event → backend links coverage to escrow
```

## Pool Management Flow

```
Admin:
1. POST /pool/create → backend returns PoolFactory.createPool() call params
2. Frontend calls PoolFactory.createPool(...) with ZeroDev AA
3. POST /pool/policy/:address → backend returns addPolicy() call params

LP Staking:
1. POST /pool/stake { amount, pool_address } → backend returns stake() call params
2. Frontend calls pool.stake(amount) with ZeroDev AA
3. GET /pool/status → backend returns pool TVL, staker count, premiums earned
```

## SDK Integration

```typescript
import { ReineiraSDK } from '@reineira-os/sdk';

const sdk = ReineiraSDK.create({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY,
});
await sdk.initialize();

// Create escrow with insurance
const escrow = await sdk.escrow
  .build()
  .amount(sdk.usdc(invoiceAmount))
  .owner(exporterWallet)
  .condition(process.env.RESOLVER_ADDRESS, resolverData)
  .insurance({
    pool: process.env.POOL_ADDRESS,
    policy: process.env.POLICY_ADDRESS,
    coverageAmount: sdk.usdc(invoiceAmount),
    expiry: dueDate + 30 * 86400,
  })
  .create();
```

## Testing

```bash
cd PROVA/contracts
npx hardhat test test/ProvaPaymentResolver.test.ts
npx hardhat test test/ProvaUnderwriterPolicy.test.ts
```
