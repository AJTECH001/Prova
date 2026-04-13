---
name: integrate
description: 'Wire protocol to app end-to-end'
context: fork
agent: product-integrator
argument-hint: '[describe the flow to integrate]'
---

# Protocol Integration

**Task:** $ARGUMENTS

Read `.claude/agents/product-integrator.md` before starting.

## Acceptance Criteria

- [ ] Full flow works on testnet
- [ ] Error states handled at each boundary
- [ ] Environment variables documented
- [ ] No hardcoded contract addresses

## Handoff

Return: integration code and configuration connecting frontend → backend → protocol.
