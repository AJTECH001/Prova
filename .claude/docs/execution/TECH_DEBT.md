---
role: execution
depends-on: []
triggers: [architecture review, security audit prep]
last-reviewed: 2026-04-29
---

# Technical Debt — PROVA

> High-impact improvements for future implementation. Newest entries at the top.

## zkTLS/zkKYC Integration for Country Verification

**Priority:** High
**Effort:** Medium
**Timeline:** Q3 2026 (when Reineira Code adds zkTLS support)

### Current State
- Country verification relies on static `bytes2 countryCode` parameter
- No cryptographic proof user is actually from claimed region
- Manual/trust-based country assignment creates compliance risk

### Target State
**zkPass/zkKYC Integration:**
- Users prove country of residence via zkTLS to government databases
- Zero-knowledge proof generation for identity verification
- On-chain verification without exposing personal data

**Technical Implementation:**
```solidity
// Future interface
interface IzkKYCVerifier {
    function verifyCountryProof(
        bytes32 commitment,     // User's country commitment
        bytes calldata proof,   // zkSNARK proof
        bytes2 claimedCountry  // ISO 3166-1 alpha-2
    ) external view returns (bool verified);
}
```

### Business Impact
- **Compliance:** Meet EU MiCA country verification requirements
- **Trust:** Remove manual country declaration (fraud prevention)
- **Scale:** Enable automated onboarding for institutional clients

### Technical Requirements
1. **zkPass SDK Integration** (waiting for Reineira Code support)
2. **Government Database Connectors** (passport/ID verification)
3. **Smart Contract Verifier** (proof validation on-chain)
4. **Privacy Preserving** (no PII stored on-chain)

### Implementation Notes
- Monitor Reineira Code roadmap for zkTLS availability
- Consider Reclaim Protocol as interim solution
- Prepare compliance framework for EU/US markets

---

## zkTLS for Off-Chain Risk Data Integration

**Priority:** High
**Effort:** Large
**Timeline:** Q4 2026

### Current State
- Risk evaluation uses only on-chain credit scores (`IDebtorProof` adapter)
- Loss history only tracks on-chain claims in `InsuranceClaimsRegistry`
- Limited data sources for comprehensive risk assessment
- Static risk models without real-world financial data

### Target State
**PROVA's zkTLS Risk Verification System:**
- Build proprietary off-chain data verification infrastructure
- Integrate verified financial data from banks/credit bureaus via zkTLS
- Develop PROVA's own historical loss data aggregation system
- Combine payment history from processors via zkTLS
- Mix on-chain + off-chain data for superior risk models

**Off-Chain Data Sources via zkTLS:**
- **Credit & Banking:**
  - Bank account balances (without exposing exact amounts)
  - Credit bureau scores (Experian, Equifax, TransUnion)
  - Payment processor transaction history
  - Traditional credit card payment patterns

- **Insurance Loss History:**
  - Claims history from traditional trade credit insurance providers
  - Default rates from factoring companies
  - Supply chain disruption history
  - Cross-industry loss patterns

- **Business Intelligence:**
  - Company financial statements (verified via accounting systems)
  - Trade references from ERP systems (SAP, Oracle)
  - Supplier/buyer relationship history
  - Market volatility exposure data

### Technical Architecture
```solidity
contract TradeCreditInsurancePolicy {
    struct EnhancedRiskProfile {
        // On-chain data (current)
        euint32 onChainCreditScore;    // Existing CoFHE score

        // Off-chain data (via zkTLS)
        euint32 offChainCreditScore;   // Bank/bureau verified score
        euint32 lossHistoryScore;      // Traditional insurance loss data
        euint32 paymentHistoryScore;   // Stripe/PayPal verified patterns
        euint32 businessIntelScore;    // ERP/accounting system data

        // Combined assessment
        euint32 combinedRiskScore;     // Weighted combination
        uint256 lastUpdated;          // Staleness protection
        uint256 dataSourceMask;       // Which sources were used
    }

    function evaluateRisk(
        uint256 coverageId,
        bytes calldata zkProofBundle  // Multiple zkTLS proofs
    ) external returns (euint64 riskScore) {
        // 1. Verify each zkTLS proof (credit, loss history, payments, etc.)
        // 2. Extract encrypted scores from each data source
        // 3. Apply weighted combination algorithm
        // 4. Update InsuranceClaimsRegistry with enhanced data
        // 5. Return comprehensive risk assessment
    }
}

interface IzkTLSRiskVerifier {
    struct RiskProofBundle {
        bytes creditBureauProof;      // Credit score verification
        bytes lossHistoryProof;       // Insurance claims history
        bytes paymentHistoryProof;    // Payment processor data
        bytes financialStmtProof;     // Accounting system data
    }

    function verifyRiskBundle(
        RiskProofBundle calldata proofs,
        bytes32 debtorId
    ) external view returns (EnhancedRiskProfile memory);
}
```

### Business Impact
- **Accuracy:** Better risk models = better pricing
- **Competitive Advantage:** Superior data = market differentiation
- **Institutional Ready:** Meet enterprise-grade due diligence standards

---

## Oracle-Based Timestamp Verification

**Priority:** Medium
**Effort:** Small
**Timeline:** Q2 2026

### Current State
- Using `block.timestamp` for claim timing (manipulable by miners)
- ~15 second manipulation window creates attack vector
- Critical for trade credit insurance timing accuracy

### Target State
**Chainlink Oracle Integration:**
- Tamper-resistant timestamp verification
- Multiple oracle consensus for timing decisions
- Staleness protection for oracle data

### Implementation
```solidity
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TradeInvoiceResolver {
    AggregatorV3Interface public immutable timestampOracle;

    function isConditionMet(uint256 escrowId) external view returns (bool) {
        uint256 oracleTime = _getOracleTimestamp();
        return oracleTime >= condition.dueDate + condition.waitingPeriod;
    }
}
```

---

## Shared Math Library for FHE Operations

**Priority:** Medium
**Effort:** Small
**Timeline:** Q2 2026

### Current State
- Duplicated FHE math patterns across contracts
- Risk evaluation logic scattered in policy contracts
- Hard to maintain and audit FHE operations

### Target State
**Centralized FHE Math Library:**
```solidity
library FHERiskMath {
    function evaluateRiskCurve(
        euint32 score,
        euint32[6] memory thresholds,
        euint32[6] memory premiums
    ) internal returns (euint32 premium) {
        // Reusable risk curve evaluation
        // Used by all insurance policies
    }

    function applyAddons(
        euint32 basePremium,
        euint16 countryRisk,
        euint16 industryRisk
    ) internal returns (euint32 totalPremium) {
        // Standardized risk add-on calculation
    }
}
```

### Benefits
- **DRY Principle:** Single source of truth for FHE math
- **Auditability:** Centralized crypto operations
- **Reusability:** Share across all insurance products

---

## Implementation Priority

1. **Q2 2026:** Oracle timestamps + Shared math library (foundational)
2. **Q3 2026:** zkKYC country verification (compliance critical)
3. **Q4 2026:** zkTLS risk data integration (competitive advantage)

## Monitoring

- **zkTLS Availability:** Monitor Reineira Code roadmap
- **Compliance Deadlines:** Track EU MiCA requirements
- **Security Audits:** Include tech debt in scope planning