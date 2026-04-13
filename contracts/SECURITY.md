# Prova Smart Contracts — Professional Security Architecture

## Executive Summary

Prova implements two core plugins for ReineiraOS: a **Payment Resolver** (condition logic) and an **Underwriter Policy** (risk pricing & dispute adjudication). Both contracts follow enterprise-grade security patterns from the ReineiraOS security model, including UUPS proxies, reentrancy guards, and access control.

This document details the security properties, threat model, and testnet limitations.

---

## 1. Architecture Overview

### Layer Structure

```
┌─────────────────────────────────────────────┐
│  Frontend (Seller Dashboard)                │
├─────────────────────────────────────────────┤
│  SDK (@reineira-os/sdk, fhenix.js)          │
├─────────────────────────────────────────────┤
│  Your Plugins                               │
│  ├─ ProvaPaymentResolver.sol                │
│  └─ ProvaUnderwriterPolicy.sol              │
├─────────────────────────────────────────────┤
│  ReineiraOS Protocol (Deployed)             │
│  ├─ ConfidentialEscrow                      │
│  ├─ ConfidentialCoverageManager             │
│  └─ InsurancePool                           │
├─────────────────────────────────────────────┤
│  Fhenix FHE Layer                           │
│  ├─ CoFHE Coprocessor                       │
│  └─ Encrypted Types (euint64, ebool)        │
├─────────────────────────────────────────────┤
│  External Integrations                      │
│  ├─ Chainlink/Custom Oracles                │
│  ├─ CCTP (Circle Cross-Chain)               │
│  └─ zkTLS Proof Services (Future)           │
├─────────────────────────────────────────────┤
│  Settlement Layer                           │
│  ├─ Arbitrum Sepolia (L2)                   │
│  └─ Fhenix CoFHE (Encryption)               │
└─────────────────────────────────────────────┘
```

**Your plugins sit at Layer 3 (green zone).** You do not deploy or modify the ReineiraOS protocol. You only implement two interfaces.

---

## 2. Security Model

### 2.1 Threat Categories

#### A. Smart Contract Security

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Reentrancy** | High | `ReentrancyGuard` on all writes |
| **Integer Overflow** | High | Solidity ^0.8.24 (automatic) |
| **Unchecked Calls** | Medium | All external calls are from protocol (trusted) |
| **Storage Collision** | Medium | UUPS pattern + ERC-7201 (future upgrade) |
| **Improper Access Control** | High | `Ownable` for admin, timelock for production |
| **Double Initialization** | High | `Initializable` + `isInitialized` flag |

**Status**: ✅ **Production-Ready (Testnet)**

---

#### B. Privacy (FHE Layer)

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Input Decryption** | Critical | Never call `FHE.decrypt()` in contract; stay encrypted |
| **Side-Channel Leaks** | Medium | FHE arithmetic is constant-time (coprocessor handles) |
| **Ciphertext Malleability** | Low | CoFHE uses standard FHE; no known attacks (testnet) |
| **Access Control Bypass** | High | `FHE.allow()` & `FHE.allowThis()` on all outputs |

**Status**: ⚠️ **Testnet Grade** (CoFHE not yet audited for production)

---

#### C. Oracle / Data Integrity

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Stale Pricing** | High | Oracle refresh intervals + fallback thresholds |
| **Spoofed Proofs** | High | Future: zkTLS signature verification |
| **Single Oracle Failure** | Medium | Support multiple oracle feeds (future) |

**Status**: 🟡 **MVP (Time-Based Only)**

No external oracle dependency in MVP. Condition is purely time-based.

---

#### D. Cross-Chain Settlement

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **CCTP Failure** | Medium | Circle's CCTP is audited; fallback: keep funds in escrow |
| **Operator Censoring** | High | Operator slashing (future: production feature) |
| **Network Latency** | Low | Async settlement allows 15-min relay window |

**Status**: ⚠️ **Production Timelock Pending**

Current testnet: zero timelock. Production: 7-day challenge window per ReineiraOS model.

---

### 2.2 Cryptographic Assumptions

#### FHE Safety Properties

```solidity
// ✓ SAFE: All operations stay in ciphertext
euint64 invoiceAmount = FHE.asEuint64(encInvoice);  // Still encrypted
euint64 buyerScore = FHE.asEuint64(encScore);      // Still encrypted
ebool isLowRisk = FHE.gte(buyerScore, threshold);  // Comparison in ciphertext
euint64 premium = FHE.mul(invoiceAmount, multiplier);  // Multiplication in ciphertext

// ✗ NEVER ALLOWED: Decryption in contract
uint64 score = FHE.decrypt(encScore);  // Would destroy privacy!
```

---

#### Determinism Guarantee

Same inputs → Same encrypted outputs (good for auditing):

```
Input (buyerScore=720) + (invoiceAmount=1000) 
  ↓ (Deterministic FHE)
Output premium=5000 (encrypted)  [Always the same ciphertext for these inputs]
```

This means you can log encrypted outputs for compliance without revealing plaintext.

---

### 2.3 Assumption Stack (Bottom-Up Trust)

```
1. CoFHE Coprocessor
   └─ Fhenix team assumes no coprocessor compromise
   └─ Testnet: not audited; production: cryptography audit required

2. EVM (Arbitrum Sepolia)
   └─ Arbitrum validators ensure state consistency
   └─ Assume < 50% validator collusion (production: multi-sig threshold)

3. Circle CCTP
   └─ Circle attesters are honest (same as all CCTP apps)
   └─ Single point of failure if attesters compromised

4. Your Contract Logic
   └─ Code is correct (this is what audits verify)
   └─ Reasonable runtime assumptions (no budget exhaustion)

5. Caller (ConfidentialEscrow)
   └─ ReineiraOS protocol calls your functions
   └─ Implicit trust: protocol is vetted by Fhenix team
```

---

## 3. ProvaPaymentResolver Security

### 3.1 Interface

```solidity
function onConditionSet(uint256 escrowId, bytes calldata data) external;
function isConditionMet(uint256 escrowId) external view returns (bool);
```

### 3.2 State Machine

```
                    ┌─────────────────────┐
                    │   UNINITIALIZED     │
                    │  (escrowId unused)  │
                    └──────────┬──────────┘
                               │
                    onConditionSet(...) 
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CONFIGURED        │
                    │ (locked, immutable) │
                    └──────────┬──────────┘
                               │
                      block.timestamp >= dueDate
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CONDITION_MET     │
                    │ (funds unlocked)    │
                    └─────────────────────┘
```

**Critical Property**: Once `CONFIGURED`, the escrow terminates at exactly `dueDate`. No refund, no cancellation, no appeal.

---

### 3.3 Validation Rules

| Input | Rule | Reason |
|-------|------|--------|
| `buyer` | ≠ address(0) | Prevents loss to burn address |
| `amount` | > 0 | Avoids ghost invoices |
| `dueDate` | > block.timestamp | No instant settlement (too dangerous) |
| **Duplicate** | Rejected | `isInitialized` flag prevents reentrancy |

---

### 3.4 Gas Efficiency

| Operation | Gas | Notes |
|-----------|-----|-------|
| `onConditionSet()` | ~25,000 | One SSTORE, validation, event |
| `isConditionMet()` | ~2,500 | Two SLOADs, one comparison (hot-path) |

The condition resolver is optimized for **ConfidentialEscrow** to poll frequently without gas exhaustion.

---

### 3.5 Testnet Behavior

**Current (MVP)**:
- ✅ Time-based settlement only
- ✅ No off-chain oracle requirements
- ❌ No pause mechanism (added in production)
- ❌ No fee on settlement (future: 0.1 % operator fee)

**Future (Post-MVP)**:
- Add oracle proof verification
- Add pausable() for emergency (e.g., Arbitrum downtime)
- Add slashing mechanism (miss payments → operator collateral burned)

---

## 4. ProvaUnderwriterPolicy Security

### 4.1 Interface

```solidity
function onPolicySet(uint256 coverageId, bytes calldata data) external;
function evaluateRisk(uint256 escrowId, bytes calldata riskProof) external returns (euint64);
function judge(uint256 coverageId, bytes calldata disputeProof) external returns (ebool);
```

---

### 4.2 Data Flow (Privacy Guarantee)

```
Seller Input (Plaintext)
├─ Invoice Amount: $1,000
├─ Buyer Credit Score: 750
└─ Days Due: 30

        ↓ [SDK Encryption - runs in browser]

Encrypted Payload (stays encrypted end-to-end)
├─ encInvoiceAmount (encrypted)
├─ encBuyerScore (encrypted)
└─ encDaysDue (encrypted)

        ↓ [Sent to evaluateRisk()]

FHE Computation (CoFHE coprocessor)
├─ Compare encBuyerScore >= 700 → ebool (no plaintext)
├─ Calculate premium formula → euint64 (no plaintext)
└─ No decryption anywhere

        ↓ [Return encrypted premium]

Premium (encrypted)
├─ encPremium: 500 bps (encrypted)
├─ Not viewable as plaintext
└─ Only decryptable by authorized buyer

        ↓ [ConfidentialCoverageManager calls FHE.decrypt()]

Plaintext Premium (only buyer sees)
└─ 500 bps = 5% of invoice = $50
```

**Critical**: Your contract **never** decrypts. Only receipt and multiplication in ciphertext.

---

### 4.3 Risk Model (MVP)

```
Base Premium := 500 bps (5.0%)

IF score >= 700 THEN
    Multiplier := 1.0x
    Premium := 500 * 1 = 500 bps  [Low Risk = 5%]
ELSE
    Multiplier := 2.0x
    Premium := 500 * 2 = 1000 bps  [High Risk = 10%]
END IF

Final Premium := Premium × (Invoice Amount / 10,000)
```

**Example**:
- Invoice: $1,000
- Buyer Score: 750 (>= 700) → 1.0x multiplier
- Premium: 500 bps × 1.0 = 500 bps = 5% = $50

---

### 4.4 Dispute Resolution (Judge)

```
Dispute Proof Submission
├─ Status Code: 1 (verified non-payment)
└─ Encrypted: stays in ciphertext

FHE Comparison
├─ Check: encStatus == 1 (all encrypted)
└─ Result: ebool (true/false, encrypted)

Verdict
├─ true = Approve claim payout
├─ false = Deny claim
└─ No human subjectivity (deterministic algorithm)
```

**Future Extension**: Multi-sig override for disputed verdicts (e.g., seller appeals with evidence).

---

### 4.5 FHE Operation Reference

| Operation | Notation | Usage | Example |
|-----------|----------|-------|---------|
| **Comparison** | `FHE.gte(a, b)` | Less/greater than (encrypted) | `score >= 700` |
| **Conditional Select** | `FHE.select(cond, a, b)` | If/else on ciphertext | `isLowRisk ? 1x : 2x` |
| **Multiplication** | `FHE.mul(a, b)` | Multiply encrypted values | `premium * multiplier` |
| **Equality** | `FHE.eq(a, b)` | Test equality (returns ebool) | `status == 1` |
| **Type Conversion** | `FHE.asEuint64(InEuint64)` | Input → compute format | Convert proof input |
| **Access Grant** | `FHE.allow(value, recipient)` | Let caller decrypt | `allow(premium, buyer)` |

---

## 5. Testnet Limitations

### 5.1 Known Issues

| Limitation | Impact | Timeline |
|-----------|--------|----------|
| **FHE not audited** | Encryption security unverified | Pre-production |
| **No slashing** | Malicious operators face no penalty | Q2 2024 |
| **No timelock** | Admin upgrades instant (dangerous!) | Q1 2024 |
| **Single coordinator** | Relay failure = stalled settlement | Q2 2024 |
| **CoFHE latency** | ~1 second per FHE operation | May improve |

---

### 5.2 Testnet ≠ Production

**DO NOT USE FOR REAL FUNDS OR PRODUCTION APPLICATIONS**

Testnet is for development, integration testing, and demo purposes only. Before production:

- [ ] Cryptographic audit of CoFHE by independent firm
- [ ] Multi-sig governance (3-of-5 or similar)
- [ ] 7-day timelock on all contract upgrades
- [ ] Slash pool (minimum USD $1M) for operator collateral
- [ ] Insurance pool liquidity (minimum USD $10M)
- [ ] Legal opinion on insurance regulation (jurisdiction-specific)

---

## 6. Security Checklist

### Pre-Launch

- [ ] Contracts compiled with no warnings
- [ ] All tests passing (>95% coverage)
- [ ] Gas optimization review (no wasted SLOAD/SSTORE)
- [ ] Owner: multi-sig (not EOA)
- [ ] Pause mechanism implemented (`Pausable`)
- [ ] Emergency withdrawal function (with timelock)
- [ ] Event logging for all state changes

### Post-Launch (Testnet)

- [ ] Monitor escrow settlement success rate
- [ ] Log all FHE computation latencies
- [ ] Track oracle proof submission patterns
- [ ] Alert on unusual claim rates
- [ ] Monthly security review of audit logs

### Pre-Production

- [ ] Third-party smart contract audit (Certora / Trail of Bits)
- [ ] FHE cryptography audit (NIST / academic team)
- [ ] Legal survey (insurance regulation per jurisdiction)
- [ ] Insurance pool capitalization (minimum $10M)
- [ ] Operator slashing mechanism live
- [ ] 7-day timelock on all upgrades

---

## 7. Deployment Guide

### Testnet (Arbitrum Sepolia)

```bash
# 1. Deploy resolver implementation
npx hardhat run scripts/deploy-resolver.ts --network arbitrumSepolia

# 2. Deploy resolver proxy (UUPS)
npx hardhat run scripts/deploy-resolver-proxy.ts --network arbitrumSepolia

# 3. Deploy policy implementation
npx hardhat run scripts/deploy-policy.ts --network arbitrumSepolia

# 4. Deploy policy proxy
npx hardhat run scripts/deploy-policy-proxy.ts --network arbitrumSepolia

# 5. Register with ReineiraOS
npm run reineira /register-resolver ...
npm run reineira /register-policy ...
```

---

## 8. Emergency Procedures

### If FHE Consensus Fails

1. Call `Pausable.pause()` on all contracts
2. Freeze new escrow settlement
3. Notify Fhenix + ReineiraOS teams
4. Await CoFHE recovery (or reset)
5. Unpause after confirmation

### If Operator Relay Stalls

1. Check Circle CCTP attestation status
2. If stalled > 1 hour, call `emergencyWithdraw()`
3. Funds return to seller (keeps custody)
4. Manual settlement via governance vote

---

## 9. Q&A

### Q: Can a buyer see what the seller's credit score is?

**A:** No. The credit score stays encrypted throughout:
- Seller encrypts it in browser
- You compare it in ciphertext
- Only the premium appears (as plaintext to buyer)
- Buyer never sees the score itself

This is the power of FHE: **computation without visibility**.

---

### Q: What if I want to add a country risk adjustment later?

**A:** Upgrade the `evaluateRisk()` function via UUPS:

```solidity
// v2: Add country risk factor
euint64 countryRisk = FHE.asEuint64(encCountryCode);
euint64 countryAdjustment = FHE.mul(premium, countryRisk);
```

Deploy new implementation, call `upgradeTo()`, and pool continues.

---

### Q: Is this GDPR-compliant?

**A:** Mostly yes, **with caveats**:

- ✅ Buyer credit score: encrypted, meets "pseudonymization" standard
- ✅ Invoice terms: encrypted, not linked to personal data
- ⚠️ Seller identity: plaintext (necessary for compliance)
- ⚠️ Settlement history: on-chain forever (no right to delete)

**Recommendation**: Wrap in a privacy policy explaining on-chain data persistence.

---

### Q: Can a seller dispute a disputed verdict?

**A:** In MVP: no. Judge() is deterministic (same inputs → same verdict).

Future: **Optimistic Rollup** model:
1. Judge returns verdict
2. Seller has 7 days to dispute
3. Multi-sig reviews with new evidence
4. Override or confirm verdict

---

## 10. References

- **ReineiraOS Docs**: https://docs.reineira.xyz (gated access)
- **Fhenix FHE Types**: https://docs.fhenix.io/
- **OpenZeppelin Security**: https://docs.openzeppelin.com/contracts/
- **ERC-165 Standard**: https://eips.ethereum.org/EIPS/eip-165
- **ERC-2771 Meta-Tx**: https://eips.ethereum.org/EIPS/eip-2771
- **ERC-7201 Storage**: https://eips.ethereum.org/EIPS/eip-7201
- **UUPS Proxy Pattern**: https://eips.ethereum.org/EIPS/eip-1822

---

## Appendix: Changelog

### v1.0 (Current - Testnet MVP)

- ✅ ProvaPaymentResolver with time-based settlement
- ✅ ProvaUnderwriterPolicy with FHE risk evaluation
- ✅ UUPS proxy pattern for upgradability
- ✅ ReentrancyGuard for all external writes
- ✅ ERC-165 interface detection
- ❌ Pause mechanism (future)
- ❌ Slashing (future)
- ❌ Multi-sig ownership (testnet only)

### v2.0 (Planned - Production)

- [ ] Oracle proof verification (zkTLS)
- [ ] Pausable contracts
- [ ] Emergency withdrawal
- [ ] Multi-sig governance (3-of-5)
- [ ] 7-day timelock
- [ ] Slash pool (1M+ USD)
- [ ] Cryptographic audit

---

**Last Updated**: March 31, 2026  
**Version**: 1.0 (Testnet MVP)  
**Author**: Prova Development Team  
**License**: MIT

For security issues, email: security@prova-protocol.xyz
