---
role: strategy
depends-on: [BUSINESS_MODEL.md]
triggers: [incentive change, fee structure change, new economy role]
last-reviewed: 2026-04-14
---

# Tokenomics & Incentive Design — PROVA

## Open Economy Role

PROVA plays two roles in the ReineiraOS open economy:

| Role              | Description                               | Revenue Mechanism                    |
| ----------------- | ----------------------------------------- | ------------------------------------ |
| Policy Builder    | `ProvaUnderwriterPolicy` — FHE risk model | Share of net premiums from pools     |
| Pool Underwriter  | Create + manage insurance pools           | Net premiums minus claims            |

LPs are third parties who stake USDC into the PROVA pool and earn proportional premium yield.

## Flywheel

```
Better FHE risk model → More accurate pricing →
More exporters buy coverage → More premiums flow to pool →
More LP yield → More liquidity → More coverage capacity →
More exporters covered → Better payment data → Better risk model → ...
```

## Fee Structure

| Fee                   | Rate                | Who Pays            | Who Earns          |
| --------------------- | ------------------- | ------------------- | ------------------ |
| Escrow creation       | 0.3%                | Exporter            | PROVA              |
| Insurance premium     | 1-3% of invoice     | Exporter (coverage) | Pool LPs + PROVA   |
| LP yield              | Net premiums - claims | PROVA pool        | LP stakers         |
| Claim payout          | Up to 100% invoice  | Pool (insurance)    | Exporter (on default) |

## Sustainability Analysis

- **Break-even**: ~$5M annual insured volume at 2% avg premium and 60% claim ratio
- **Subsidy-free**: Yes — premium income > operational costs once pool reaches $500K TVL
- **Risk**: If claim ratio > 70% in early pools, LP yield collapses; requires careful whitelist at launch

## Token Design

**No token at this stage.** Token launches are deferred until:
- Network effects require coordination incentives beyond LP yield
- Governance is genuinely distributed across 1000+ stakeholders
- Clear non-speculative utility can be demonstrated

Revenue-sharing via premium distribution is sufficient for Phase 1-2.
