---
role: legal
depends-on: []
triggers: [new regulation, new market, data handling change]
last-reviewed: 2026-04-14
---

# Compliance Framework — PROVA

## Applicable Regulations

| Regulation        | Applies?    | Status      | Notes                                               |
| ----------------- | ----------- | ----------- | --------------------------------------------------- |
| MiCA (EU)         | Maybe       | Not started | Depends on whether PROVA classifies as a CASP       |
| Insurance law (EU)| Yes (scale) | Not started | Trade credit insurance is regulated in most markets |
| AML/KYC           | Yes         | Partial     | KYB flow implemented (business-profile); TM needed  |
| GDPR              | Yes         | Not started | EU exporters likely; data minimization required     |
| Travel Rule       | Yes         | Not started | Transfers >$1000 — USDC via Circle (VASP-level)     |

## Insurance Regulatory Risk

PROVA provides on-chain trade credit insurance. Key regulatory flags:

- **EU**: Solvency II applies to insurance undertakings; DeFi insurance has unclear classification
- **US**: State-level insurance licensing required to sell insurance products to US persons
- **Mitigation (Phase 1-2)**: Target non-US, non-EU SME exporters; position as "escrow with smart recovery" not "insurance product"
- **Phase 3+**: Consult insurance regulatory counsel before marketing as "insurance"

## MiCA Checklist

- [ ] Determine if PROVA qualifies as a CASP (Crypto-Asset Service Provider)
- [ ] Assess if insurance pool tokens are "e-money tokens" or "asset-referenced tokens"
- [ ] Circle/USDC MiCA authorization status: authorized
- [ ] Whitepaper not required (no token at this stage)

## AML/KYC Requirements

- [x] Business profile (KYB) flow implemented (`POST /business-profiles`)
- [ ] KYB verification integration (e.g., Persona, Sumsub) — not yet wired
- [ ] Transaction monitoring for patterns (>$10K invoice, high default rate)
- [ ] SAR filing procedures documented
- [ ] Record retention policy (5 years minimum)

## Smart Contract Audit

- [ ] Schedule audit before mainnet: ProvaPaymentResolver + ProvaUnderwriterPolicy
- [ ] Focus: FHE value handling, access control, pool drain vectors
- [ ] At least one independent audit firm (Certik, Halborn, or equivalent)
- [ ] Address all critical/high findings before real USDC transactions

## Minimum Legal Documents (before public launch)

- [ ] Terms of Service (exporter + LP)
- [ ] Privacy Policy
- [ ] Risk Disclaimers (DeFi + smart contract risks)
- [ ] Insurance Product Disclosures (if marketing as insurance)
- [ ] Cookie Policy
