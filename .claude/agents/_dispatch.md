---
role: system
depends-on: [SYSTEM.md]
triggers: [every prompt]
last-reviewed: 2026-03-20
---

# Agent Dispatch — Reineira Atlas

> Routes every prompt to the right agent chain. Protocol-aware routing for ventures building on
> ReineiraOS.

---

## How Dispatch Works

1. Match prompt against **signal keywords** below
2. Load **primary agent** from `agents/`
3. Optionally load **support agents** for cross-domain tasks
4. Agent loads its `depends-on` docs automatically
5. Execute and log

---

## Routing Table

### Protocol & Smart Contracts

| Prompt Signal                                                                 | Primary Agent       | Support            | Docs Loaded                            |
| ----------------------------------------------------------------------------- | ------------------- | ------------------ | -------------------------------------- |
| "resolver", "condition", "escrow release", "isConditionMet", "onConditionSet" | `protocol-resolver` | —                  | PROTOCOL_INTEGRATION.md                |
| "policy", "insurance", "risk score", "dispute", "underwriter", "coverage"     | `protocol-policy`   | —                  | PROTOCOL_INTEGRATION.md                |
| "deploy", "testnet", "mainnet", "verify contract"                             | `protocol-deploy`   | —                  | PROTOCOL_INTEGRATION.md                |
| "zkTLS", "Reclaim", "proof", "oracle", "Chainlink", "UMA"                     | `protocol-resolver` | —                  | PROTOCOL_INTEGRATION.md                |
| "pool", "liquidity", "staking", "operator"                                    | `protocol-policy`   | `strategy-advisor` | PROTOCOL_INTEGRATION.md, TOKENOMICS.md |

### Product & App Development

| Prompt Signal                                                         | Primary Agent        | Support             | Docs Loaded                              |
| --------------------------------------------------------------------- | -------------------- | ------------------- | ---------------------------------------- |
| "frontend", "component", "page", "UI", "Vue", "Pinia"                 | `product-frontend`   | —                   | ARCHITECTURE.md                          |
| "backend", "API", "endpoint", "Lambda", "DynamoDB", "SAM"             | `product-backend`    | —                   | ARCHITECTURE.md                          |
| "integrate", "wire up", "connect", "SDK", "escrow flow", "end-to-end" | `product-integrator` | `protocol-resolver` | PROTOCOL_INTEGRATION.md, ARCHITECTURE.md |
| "design", "mockup", "UX", "branding"                                  | `product-frontend`   | —                   | ARCHITECTURE.md                          |

### Strategy & Business

| Prompt Signal                                                 | Primary Agent         | Support            | Docs Loaded                                 |
| ------------------------------------------------------------- | --------------------- | ------------------ | ------------------------------------------- |
| "strategy", "should we", "pricing", "pivot", "business model" | `strategy-advisor`    | —                  | BUSINESS_MODEL.md, ROADMAP.md               |
| "tokenomics", "token", "incentive", "emission", "flywheel"    | `strategy-tokenomics` | —                  | TOKENOMICS.md, BUSINESS_MODEL.md            |
| "pitch", "investor", "fundraise", "deck", "fund intro"        | `strategy-pitch`      | `strategy-advisor` | BUSINESS_MODEL.md, ROADMAP.md, METRICS.md   |
| "unit economics", "revenue", "LTV", "CAC", "margin"           | `strategy-advisor`    | —                  | BUSINESS_MODEL.md, METRICS.md               |
| "blueprint", "which vertical", "market size", "TAM"           | `strategy-advisor`    | —                  | BUSINESS_MODEL.md, COMPETITIVE_LANDSCAPE.md |

### Growth & Community

| Prompt Signal                                              | Primary Agent      | Support            | Docs Loaded                       |
| ---------------------------------------------------------- | ------------------ | ------------------ | --------------------------------- |
| "community", "Discord", "Telegram", "developer relations"  | `growth-community` | —                  | COMMUNITY_STRATEGY.md             |
| "blog", "article", "tutorial", "guide", "documentation"    | `growth-content`   | —                  | COMMUNITY_STRATEGY.md             |
| "Twitter", "Farcaster", "thread", "social", "announcement" | `growth-content`   | —                  | COMMUNITY_STRATEGY.md             |
| "partnership", "integration", "ecosystem", "grant"         | `growth-community` | `strategy-advisor` | COMMUNITY_STRATEGY.md, ROADMAP.md |
| "hackathon", "bounty", "developer program"                 | `growth-community` | —                  | COMMUNITY_STRATEGY.md             |

### Operations

| Prompt Signal                                          | Primary Agent | Support | Docs Loaded                           |
| ------------------------------------------------------ | ------------- | ------- | ------------------------------------- |
| "weekly review", "sprint", "progress", "plan the week" | `core-chief`  | —       | SPRINT_LOG.md, ROADMAP.md, METRICS.md |
| "metrics", "KPI", "how are we doing", "dashboard"      | `core-chief`  | —       | METRICS.md                            |

### Legal & Compliance

| Prompt Signal                                    | Primary Agent  | Support             | Docs Loaded                            |
| ------------------------------------------------ | -------------- | ------------------- | -------------------------------------- |
| "compliance", "MiCA", "AML", "KYC", "regulation" | `legal-crypto` | —                   | COMPLIANCE.md                          |
| "terms", "privacy policy", "disclaimer", "legal" | `legal-crypto` | —                   | COMPLIANCE.md                          |
| "audit", "security review", "vulnerability"      | `legal-crypto` | `protocol-resolver` | COMPLIANCE.md, PROTOCOL_INTEGRATION.md |

---

## Chain Execution Rules

1. **Never skip dispatch.** Every prompt flows through this table.
2. **Primary agent owns the output.** Support agents contribute context only.
3. **Load docs before executing.** The agent's `depends-on` list is mandatory.
4. **Log strategic decisions.** Any constraining choice → `data/decisions/`.
5. **Check metrics first.** Before any recommendation, read current metrics.
6. **One agent per output.** Multi-agent tasks → chain, don't merge.
7. **Protocol awareness.** Every agent knows this is a ReineiraOS venture — FHE, USDC, Arbitrum are
   givens.
8. **Blueprint context.** Check which of the 5 blueprints (or custom vertical) the builder chose.

---

## Example Chains

### "Build a chargeback insurance resolver"

```
1. _dispatch → protocol-resolver
2. Reads PROTOCOL_INTEGRATION.md → identifies Chargeback Shield pattern
3. Guides: Reclaim zkTLS for payment proof, FHE risk pricing, claim flow
4. Output: resolver spec + pointer to reineira-code
```

### "What's our unit economics?"

```
1. _dispatch → strategy-advisor
2. Reads BUSINESS_MODEL.md, METRICS.md
3. Calculates: premium revenue, claim ratio, pool yield, net margin
4. Output: unit economics breakdown with assumptions
```

### "Prepare for fund intro"

```
1. _dispatch → strategy-pitch (support: strategy-advisor)
2. Reads BUSINESS_MODEL.md, ROADMAP.md, METRICS.md
3. Evaluates readiness against SYSTEM.md §7 criteria
4. Output: readiness scorecard + materials checklist
```

### "Write a tutorial about our escrow flow"

```
1. _dispatch → growth-content
2. Reads COMMUNITY_STRATEGY.md, PROTOCOL_INTEGRATION.md
3. Writes: step-by-step tutorial with code samples
4. Output: publishable article draft
```
