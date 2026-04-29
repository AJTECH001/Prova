---
role: intelligence
depends-on: []
triggers: [new competitor, market shift]
last-reviewed: 2026-04-14
---

# Competitive Landscape — PROVA

## Direct Competitors

| Competitor      | What They Do                             | Weakness                        | Our Advantage                         |
| --------------- | ---------------------------------------- | ------------------------------- | ------------------------------------- |
| DeFi Credit Protocols | On-chain credit / lending          | No trade-specific insurance     | FHE credit scoring, invoice-native    |
| Credix          | Emerging market credit pools             | Custodial, not FHE-encrypted    | Non-custodial, confidential amounts   |
| Legacy TCI Providers | Traditional trade credit insurance   | Slow, expensive, offline        | On-chain settlement in minutes        |
| Enterprise TCI   | Traditional TCI for large exporters      | Min deal size $1M+, manual UW   | SME-first, automated FHE risk pricing |

## Indirect Competitors / Workarounds

What SME exporters currently do instead:
- Letter of Credit (LC) via banks — expensive, slow (weeks), paper-based
- Pay upfront / partial deposit — leaves exporter capital exposed
- Factor invoices (sell receivables) — expensive haircut (3-8%)
- Go uninsured — accept buyer default risk

## FHE Advantage

| Feature                     | PROVA | Traditional TCI | Other DeFi |
| --------------------------- | ----- | --------------- | ---------- |
| Confidential invoice amounts| Yes   | No              | No         |
| Encrypted risk evaluation   | Yes   | No              | No         |
| Non-custodial settlement    | Yes   | No              | Partial    |
| Cross-chain (CCTP)          | Yes   | No              | Partial    |
| Pluggable underwriting      | Yes   | No              | No         |
| On-chain in minutes         | Yes   | No (weeks)      | Yes        |
| SME-accessible (AA wallet)  | Yes   | No              | No         |

## Positioning

PROVA is the first trade credit insurance platform where invoice amounts are provably private on-chain, settlement is automated, and risk pricing is computed via FHE — not disclosed to underwriters.

## Threats to Watch

1. **DeFi lending protocols** entering trade finance with larger liquidity pools
2. **Traditional trade credit insurers** launching tokenized insurance products
3. **Competitor FHE chains** (e.g., Zama) enabling similar products on other EVM chains
