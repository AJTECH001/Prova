---
role: system
depends-on: [SYSTEM.md]
updates: []
triggers: [architecture change, new agent/skill added]
last-reviewed: 2026-03-20
---

# Reineira Atlas — Operating Manual

> The startup OS for ventures building on ReineiraOS. One protocol. Infinite verticals. Pick one and
> build.

---

## 1. What Is This?

Reineira Atlas is the non-code side of building a venture on ReineiraOS. It provides AI-powered
agents for strategy, operations, growth, compliance, and investor readiness — all tuned for
confidential programmable finance.

### The Three Repos

| Repo                              | What You Do There                                                    |
| --------------------------------- | -------------------------------------------------------------------- |
| **reineira-atlas** (you are here) | Run the startup — strategy, ops, growth, compliance, pitch           |
| **reineira-code**                 | Build smart contracts — resolvers, policies, tests, deploy           |
| **platform-modules**              | Ship the product — plug-and-play backend, platform app, payment link |

---

## 2. Getting Started

### First-Time Setup

```bash
# 1. Fill in your venture details
#    Edit brief.md at the project root

# 2. Run the starter agent
claude "Read .claude/agents/_starter.md then read brief.md and execute the full setup."

# 3. Done — your agent team is ready
```

### After Setup — Using Slash Commands

```bash
# Protocol
/resolver "Design a payment verification resolver using zkTLS"
/policy "Create a chargeback insurance policy"
/integrate "Wire escrow creation from frontend through backend"

# Product
/dev-frontend "Add wallet connection flow"
/dev-backend "Create invoice creation endpoint"

# Strategy
/strategy "Should we target freelancers or SMBs first?"
/tokenomics "Design the fee structure for our insurance pool"
/pitch-prep "Prepare materials for fund intro"

# Growth
/content "Write a tutorial about building resolvers"
/community "Plan our ETHGlobal hackathon strategy"

# Operations
/weekly-plan
/compliance "Review our AML/KYC requirements"
```

---

## 3. Architecture

```
reineira-atlas/
├── CLAUDE.md              ← Protocol context, contract addresses, tech stack
├── brief.md               ← YOUR venture brief (customize this)
│
└── .claude/
    ├── SYSTEM.md          ← The brain: phase, blueprints, economy roles
    │
    ├── agents/            ← WHO does things
    │   ├── _dispatch.md   ← Routes prompts → agents
    │   ├── _starter.md    ← Setup agent (run once)
    │   ├── protocol-*.md  ← Smart contract guidance
    │   ├── product-*.md   ← App development
    │   ├── strategy-*.md  ← Business, tokenomics, fundraising
    │   ├── growth-*.md    ← Community, content
    │   ├── core-chief.md  ← Operations orchestrator
    │   └── legal-*.md     ← Crypto compliance
    │
    ├── docs/              ← Source of truth
    │   ├── strategy/      ← Business model, roadmap, tokenomics
    │   ├── product/       ← Architecture, protocol integration
    │   ├── growth/        ← Community strategy
    │   ├── execution/     ← Sprint log, action items
    │   ├── intelligence/  ← Metrics, competitive landscape
    │   └── legal/         ← Compliance
    │
    ├── skills/            ← Slash commands
    │   ├── analyze/       ← /strategy, /tokenomics
    │   ├── build/         ← /resolver, /policy, /dev-frontend, /dev-backend, /integrate
    │   ├── create/        ← /content, /community
    │   ├── pitch/         ← /pitch-prep
    │   ├── plan/          ← /weekly-plan
    │   └── review/        ← /compliance
    │
    └── data/              ← Append-only logs
        ├── decisions/     ← What was decided and why
        ├── metrics/       ← KPI snapshots
        └── signals/       ← Market intelligence
```

---

## 4. How Agent Chains Work

### "Design an escrow release condition"

```
prompt → _dispatch → protocol-resolver
  → reads PROTOCOL_INTEGRATION.md
  → identifies verification source (zkTLS, oracle, multi-sig, etc.)
  → outputs resolver specification
  → points to reineira-code for Solidity implementation
```

### "Should we add insurance to our product?"

```
prompt → _dispatch → strategy-advisor (+ strategy-tokenomics)
  → reads BUSINESS_MODEL.md, METRICS.md
  → evaluates: revenue impact, complexity, FHE advantage
  → outputs recommendation with trade-offs
  → if yes: chains to protocol-policy for design guidance
```

### "Prepare for fund intro"

```
prompt → _dispatch → strategy-pitch
  → reads BUSINESS_MODEL.md, ROADMAP.md, METRICS.md
  → evaluates readiness against criteria
  → outputs: scorecard + materials to prepare
```

---

## 5. Conventions

| Rule            | Convention                          |
| --------------- | ----------------------------------- |
| Doc naming      | SCREAMING_SNAKE.md                  |
| Agent naming    | {domain}-{role}.md                  |
| Skill naming    | {verb}/{noun}/SKILL.md              |
| Data entries    | YYYY-MM-DD.md                       |
| Cross-refs      | @doc:NAME, @agent:NAME, @skill:NAME |
| Before recs     | ALWAYS read METRICS.md              |
| After decisions | Log to data/decisions/              |

---

## 6. Updating

When your brief changes (new features, pivot, new team member):

```bash
# 1. Update brief.md
# 2. Re-run starter
claude "Read .claude/agents/_starter.md then read brief.md and execute the full setup."
# 3. Starter updates existing files without destroying history
```

---

## 7. Adding New Things

| Add       | How                                                                  |
| --------- | -------------------------------------------------------------------- |
| New agent | Create `agents/{domain}-{role}.md`, add to `_dispatch.md`            |
| New skill | Create `skills/{category}/{name}/SKILL.md`, add to `_index.md`       |
| New doc   | Create in `docs/{dir}/SCREAMING_SNAKE.md` with frontmatter           |
| Decision  | Append to `data/decisions/YYYY-MM-DD.md`                             |
| Metrics   | Update `docs/intelligence/METRICS.md` + `data/metrics/YYYY-MM-DD.md` |
