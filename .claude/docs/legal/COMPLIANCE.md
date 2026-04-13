---
role: legal
depends-on: []
triggers: [new regulation, new market, data handling change]
last-reviewed: 2026-03-20
---

# Compliance Framework — {venture_name}

## Applicable Regulations

| Regulation  | Applies?       | Status      | Notes                               |
| ----------- | -------------- | ----------- | ----------------------------------- |
| MiCA (EU)   | {yes/no/maybe} | Not started | Crypto-asset service provider rules |
| AML/KYC     | {yes/no}       | Not started | Required for fiat on/off ramps      |
| GDPR        | {yes/no}       | Not started | If EU users                         |
| Travel Rule | {yes/no}       | Not started | Transfers >$1000                    |

## MiCA Checklist

- [ ] Determine CASP classification
- [ ] Whitepaper requirements (if token)
- [ ] Disclosure requirements for DeFi insurance
- [ ] Circle/USDC MiCA authorization status: authorized

## AML/KYC Requirements

- [ ] KYC at wallet creation (via Circle)
- [ ] Transaction monitoring for suspicious patterns
- [ ] SAR filing procedures
- [ ] Record retention (5 years minimum)

## Smart Contract Audit

- [ ] Schedule audit before mainnet (real funds)
- [ ] Focus: FHE value handling, access control, UUPS upgrade safety
- [ ] At least one independent audit firm
- [ ] Address all critical/high findings before launch

## Minimum Legal Documents

- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Risk Disclaimers (DeFi-specific)
- [ ] Insurance Product Disclosures (if applicable)
- [ ] Cookie Policy (if web app)
