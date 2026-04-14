---
role: strategy
depends-on: []
triggers: [revenue model change, pricing change, new revenue stream]
last-reviewed: 2026-04-14
---

# Business Model — PROVA

## Revenue Streams

| Stream              | Fee/Price             | Margin | Status      |
| ------------------- | --------------------- | ------ | ----------- |
| Insurance premium   | 1-3% of invoice value | ~75%   | Not started |
| Escrow creation fee | 0.3-0.5% per invoice  | ~95%   | Not started |
| LP management fee   | 0.3% AUM/yr (future)  | ~95%   | Not started |

### How It Works

1. **Insurance premium**: When an exporter purchases coverage, the premium flows into the insurance pool. `ProvaUnderwriterPolicy` determines the rate using FHE-encrypted credit scoring. PROVA (as policy builder) earns a share of net premiums after claims.

2. **Escrow creation fee**: Charged at escrow creation via `ConfidentialEscrow`. Simple, high-margin.

### Common Patterns on ReineiraOS

| Pattern             | Typical Fee      | Margin | Notes                  |
| ------------------- | ---------------- | ------ | ---------------------- |
| Escrow creation fee | 0.3-1% per trade | ~95%   | Simplest model         |
| Insurance premium   | 1-5% of value    | 70-90% | Requires policy + pool |
| LP management fee   | 0.3-0.5% AUM/yr  | ~95%   | For pool operators     |
| Protocol fee claims | 2-5% of payout   | ~100%  | Insurance ventures     |

## Pricing

- Invoice insurance: 1-3% of invoice face value (computed by FHE credit score)
- Escrow fee: 0.3% at creation
- Pool staking: free for LPs (earn premiums proportional to stake)

## Key Assumptions

1. SME exporters are willing to pay 1-3% for buyer default protection on individual invoices
2. Arbitrum Sepolia → mainnet conversion of early testers ≥ 20%
3. Average invoice size: $10,000-$100,000 USDC equivalent
4. Pool underwriting can sustain a claim ratio below 60% at steady state

## Unit Economics Targets

| Metric         | Target    | Current |
| -------------- | --------- | ------- |
| CAC            | <$50      | —       |
| LTV            | >$500     | —       |
| LTV:CAC        | >10:1     | —       |
| Gross margin   | >70%      | —       |
| Payback period | <3 months | —       |

## Risks

1. **Regulatory**: Trade credit insurance is regulated in most jurisdictions — licensing required at scale
2. **Market**: SME exporters unfamiliar with DeFi; wallet onboarding friction
3. **Technical**: FHE computation latency in credit scoring; CoFHE worker availability
4. **Credit risk**: Adverse selection — only exporters with risky buyers purchase insurance

## 5-Year Arc

| Year | Milestone                           | Target Revenue |
| ---- | ----------------------------------- | -------------- |
| 1    | Testnet → mainnet, 50 exporters     | $50K           |
| 2    | 500 exporters, $5M GMV insured      | $150K          |
| 3    | API / white-label, partnerships     | $500K          |
| 4    | Multi-chain (CCTP v2), $50M GMV     | $1.5M          |
| 5    | Protocol-level insurance primitive  | $5M+           |
