---
name: dev-backend
description: 'Backend development task'
context: fork
agent: product-backend
argument-hint: '[describe the endpoint or feature]'
---

# Backend Development

**Task:** $ARGUMENTS

Read `.claude/agents/product-backend.md` before starting.

## Acceptance Criteria

- [ ] Code compiles (npm run build)
- [ ] Tests pass (npm run test:unit)
- [ ] Input validation on endpoints
- [ ] Proper error handling with status codes

## Handoff

Return: working code with tests following Clean Architecture layers.
