---
name: resolver
description: 'Design a condition resolver for escrow release'
context: fork
agent: protocol-resolver
argument-hint: '[describe the release condition]'
---

# Condition Resolver Design

**Task:** $ARGUMENTS

Read `.claude/agents/protocol-resolver.md` before starting.

## Acceptance Criteria

- [ ] Design matches the venture's use case
- [ ] Verification source selected (zkTLS / oracle / UMA / multi-sig / time lock)
- [ ] Security checklist addressed
- [ ] Data encoding specified for resolverData

## Handoff

Return: resolver specification with interface, storage, condition logic, and implementation path in
reineira-code.
