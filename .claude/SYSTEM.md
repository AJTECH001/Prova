---
role: system
depends-on: []
updates: [agents/_dispatch.md]
triggers: [phase change, convention update, new agent type, key metric shift]
last-reviewed: 2026-03-20
---

# Reineira Atlas — System Configuration

> Master configuration. Loaded FIRST on every Claude Code invocation. Last updated: 2026-03-20

---

## Phase

**PHASE: Not yet configured — run the starter agent to set up.**

```
claude "Read .claude/agents/_starter.md then read brief.md and execute the full setup."
```

---

## 1. Project Identity

**Reineira Atlas** is the startup operating system for ventures building on ReineiraOS — open
settlement infrastructure for confidential programmable finance on Arbitrum.

_One protocol. Infinite verticals. Pick one and build._

### The Ecosystem

| Repo                 | Role                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| **reineira-atlas**   | Run the startup (strategy, ops, growth, compliance, pitch)           |
| **reineira-code**    | Build on the protocol (Solidity resolvers, policies, tests, deploy)  |
| **platform-modules** | Ship the product (plug-and-play backend, platform app, payment link) |

### Venture Verticals

Any business that benefits from confidential escrows, pluggable insurance, or cross-chain stablecoin
settlement can build on ReineiraOS. Examples of proven verticals include P2P crypto trading
(chargeback protection), B2B invoice finance (trade credit insurance), gift card escrow, gaming
asset trading, and cross-border trade insurance — but builders are not limited to these.

The protocol primitives are general-purpose. If your use case involves "hold funds → verify a
condition → release or refund", ReineiraOS handles the settlement, encryption, and insurance layers.

### Protocol Stack (5 layers)

| Layer          | What It Does                                                 | Who Owns It            |
| -------------- | ------------------------------------------------------------ | ---------------------- |
| Application    | End-user products — marketplaces, payroll, agent wallets     | You (SDK)              |
| Plugin         | Condition resolvers, insurance policies, custom verification | Builders (Solidity)    |
| Protocol       | Escrow engine, coverage manager, pool factory, task executor | ReineiraOS             |
| Infrastructure | Operator network, coordinator service, CCTP relay            | Operators / ReineiraOS |
| Settlement     | Arbitrum L2, Fhenix CoFHE, Circle CCTP V2                    | External protocols     |

### Open Economy Roles

| Role                  | What They Do                                     | How They Earn                                          |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| **Policy Builders**   | Write insurance policies (IUnderwriterPolicy)    | Better risk models → more pool adoption → more revenue |
| **Pool Underwriters** | Create pools, attach policies, provide liquidity | Net premiums = yield                                   |
| **LP Stakers**        | Deposit into pools                               | Share of premiums proportional to stake                |
| **Operators**         | Relay cross-chain CCTP transactions              | 0.5% of bridged volume                                 |

---

## 2. Architecture

```
reineira-atlas/
├── CLAUDE.md              ← Technical context, ecosystem, protocol reference
├── brief.md               ← Builder's venture brief (customize this)
│
└── .claude/
    ├── SYSTEM.md          ← YOU ARE HERE. Phase, conventions, dispatch.
    │
    ├── agents/            ← WHO does things
    │   ├── _dispatch.md   ← Routes prompts → agent chains
    │   ├── _starter.md    ← Setup agent (reads brief, builds everything)
    │   ├── core-chief.md  ← Operations orchestrator
    │   ├── protocol-*.md  ← Smart contract guidance
    │   ├── product-*.md   ← App development
    │   ├── strategy-*.md  ← Business, tokenomics, fundraising
    │   ├── growth-*.md    ← Community, content, partnerships
    │   └── legal-*.md     ← Crypto compliance
    │
    ├── docs/              ← WHAT is true (source of truth)
    │   ├── strategy/      ← Business model, roadmap, tokenomics
    │   ├── execution/     ← Sprint log, action items
    │   ├── product/       ← Architecture, protocol integration
    │   ├── growth/        ← Community strategy, developer relations
    │   ├── intelligence/  ← Metrics, competitive landscape
    │   └── legal/         ← MiCA, AML/KYC, data privacy
    │
    ├── skills/            ← HOW to do things (slash commands)
    │   ├── _index.md      ← Complete skill registry
    │   ├── analyze/       ← Strategy, tokenomics, simulation
    │   ├── build/         ← Resolver, frontend, backend, deploy
    │   ├── create/        ← Content, docs, community posts
    │   ├── plan/          ← Sprint planning, weekly review
    │   ├── pitch/         ← Investor prep, deck, fund intro
    │   └── review/        ← Compliance, security audit
    │
    ├── templates/         ← Output templates
    │
    └── data/              ← Living data (append-only)
        ├── decisions/     ← Strategic decisions with rationale
        ├── metrics/       ← KPI snapshots
        └── signals/       ← Market intelligence
```

### Loading Order

```
1. SYSTEM.md        → Phase, conventions, blueprints, economy roles
2. CLAUDE.md        → Ecosystem repos, contract addresses, tech stack
3. _dispatch.md     → Route prompt to the right agent
4. Agent file       → Role definition, playbook, checklist
5. Docs             → Agent's depends-on list
6. Skills           → If slash command was used
7. Execute          → Do the work
8. Log              → Update SPRINT_LOG / data/ if strategic
```

---

## 3. Conventions

### Naming

| Type   | Convention             | Example                      |
| ------ | ---------------------- | ---------------------------- |
| Docs   | SCREAMING_SNAKE.md     | docs/strategy/TOKENOMICS.md  |
| Agents | {domain}-{role}.md     | protocol-resolver.md         |
| Skills | {verb}/{noun}/SKILL.md | build/resolver/SKILL.md      |
| Data   | YYYY-MM-DD.md          | data/decisions/2026-03-20.md |

### Domain Alignment

| Docs Dir        | Agent Prefix              | Skill Category | Purpose                                     |
| --------------- | ------------------------- | -------------- | ------------------------------------------- |
| `strategy/`     | `strategy-*`              | `analyze/`     | Business model, tokenomics, fundraising     |
| `product/`      | `product-*`, `protocol-*` | `build/`       | Architecture, protocol integration, app dev |
| `growth/`       | `growth-*`                | `create/`      | Community, content, developer relations     |
| `execution/`    | `core-*`                  | `plan/`        | Sprint planning, reviews, coordination      |
| `intelligence/` | `research-*`              | `analyze/`     | Metrics, competitive landscape              |
| `legal/`        | `legal-*`                 | `review/`      | Crypto compliance, MiCA, AML                |

### Cross-Reference Syntax

| Syntax                     | Resolves To                            |
| -------------------------- | -------------------------------------- |
| `@doc:TOKENOMICS`          | `.claude/docs/strategy/TOKENOMICS.md`  |
| `@doc:METRICS`             | `.claude/docs/intelligence/METRICS.md` |
| `@agent:protocol-resolver` | `.claude/agents/protocol-resolver.md`  |
| `@skill:deploy`            | `.claude/skills/build/deploy/SKILL.md` |
| `@data:decisions`          | `.claude/data/decisions/`              |

---

## 4. Agent Dispatch Logic

See `agents/_dispatch.md` for the full routing table.

---

## 5. Data Flow Rules

### Before Any Recommendation

Every strategic agent MUST:

1. Check `@doc:METRICS` for current KPI state
2. Reference protocol context (contract addresses, FHE constraints, gas)
3. Verify against current roadmap and decision framework
4. Consider which blueprint vertical the builder is in

### After Any Strategic Change

1. Update relevant doc
2. Log to `@data:decisions/YYYY-MM-DD.md`
3. Update `@doc:SPRINT_LOG` if task-related

---

## 6. Current Key Numbers

| Metric           | Value                          | Source         |
| ---------------- | ------------------------------ | -------------- |
| Stage            | _not configured_               | brief.md       |
| Blueprint        | _not configured_               | brief.md       |
| Team size        | _not configured_               | brief.md       |
| Budget           | _not configured_               | brief.md       |
| Protocol         | ReineiraOS on Arbitrum Sepolia | CLAUDE.md      |
| Settlement       | Stablecoin-agnostic (IFHERC20) | Protocol       |
| Wallet (primary) | ZeroDev (ERC-4337, passkeys)   | Module default |
| Encryption       | Fhenix CoFHE (FHE)             | Protocol       |

---

## 7. Fund Intro Pipeline

Teams building on ReineiraOS may qualify for warm introductions to early-stage funds. Managed
through the strategy-pitch agent.

### Readiness Criteria

- [ ] Working product on testnet (or mainnet)
- [ ] Clear business model documented in @doc:BUSINESS_MODEL
- [ ] Metrics tracking in place (@doc:METRICS)
- [ ] Team and vision articulated
- [ ] Pitch materials prepared via `/pitch-prep`

_Details provided at the intro stage. Not publicly listed._

---

## 8. Platform Versioning

### Current: Platform 0.1

Every repo in the ecosystem declares compatibility with a platform version in `reineira.json`:

```json
{
  "platform": "0.1",
  "version": "0.1.0"
}
```

### How it works

| Concept              | Rule                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| **Platform version** | Led by smart contract interfaces (IConditionResolver, IUnderwriterPolicy) |
| **Breaking change**  | Interface signature change → platform version bump                        |
| **Repo version**     | Own semver cycle within a platform version (0.1.0, 0.1.1, 0.1.5...)       |
| **Compatibility**    | Repo with `platform: "0.1"` works with any platform 0.1.x deployment      |
| **Incompatibility**  | Platform 0.2 may break repos still on 0.1 — flag and upgrade              |

### Version sources

| Source                      | What it provides                                         |
| --------------------------- | -------------------------------------------------------- |
| `reineira.json` (each repo) | Repo version + platform compatibility                    |
| MCP server                  | Current live platform version + contract addresses       |
| SDK package                 | `@reineira-os/sdk` version tracks platform               |
| Contract interfaces         | Source of truth — interface changes drive platform bumps |

### Ecosystem repos

| Repo                          | Type        | Own release cycle      | Platform-locked                           |
| ----------------------------- | ----------- | ---------------------- | ----------------------------------------- |
| Smart contracts (Privara)     | Protocol    | Leads platform version | IS the platform                           |
| @reineira-os/sdk              | SDK         | Follows contracts      | Yes                                       |
| reineira-code                 | Dev tooling | Independent patches    | Yes — generates interface-compatible code |
| reineira-atlas                | Startup OS  | Independent patches    | Yes — agent guidance matches interfaces   |
| platform-modules/backend      | App starter | Independent            | Yes — uses matching SDK                   |
| platform-modules/app          | App starter | Independent            | Yes — uses matching SDK                   |
| platform-modules/payment-link | App starter | Independent            | Yes — uses matching SDK                   |

### What agents should do

- Before advising on contract patterns: check that platform version in `reineira.json` matches the
  current MCP platform version
- If a builder asks about features from a newer platform version: flag that their repo needs
  upgrading
- After a platform bump: update `reineira.json`, review interface changes, update affected
  agents/docs
