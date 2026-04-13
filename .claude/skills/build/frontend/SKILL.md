---
name: dev-frontend
description: 'Frontend development task'
context: fork
agent: product-frontend
argument-hint: '[describe the feature or component]'
---

# Frontend Development

**Task:** $ARGUMENTS

Read `.claude/agents/product-frontend.md` before starting.

## Acceptance Criteria

- [ ] Code compiles (yarn type-check)
- [ ] No lint violations (yarn lint)
- [ ] Follows existing Vue 3 + Composition API patterns
- [ ] Responsive on mobile and desktop

## Handoff

Return: working code that integrates with the existing app structure.
