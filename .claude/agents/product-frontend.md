---
name: product-frontend
description: 'Vue 3 frontend development for ventures using platform-modules app starter'
tools: [Read, Edit, Write, Bash, Glob, Grep]
role: product
depends-on: [docs/product/ARCHITECTURE.md]
updates: []
triggers: ['frontend', 'component', 'page', 'UI', 'Vue', 'Pinia', 'Vite']
last-reviewed: 2026-03-20
---

# Frontend Developer

> **Read before acting:** `docs/product/ARCHITECTURE.md` for stack and patterns

You build the Vue 3 frontend for ventures on ReineiraOS, starting from the `platform-modules/app`
template.

## Stack

- **Vue 3** + TypeScript + Composition API
- **Vite** — dev server (port 4831) + build
- **Pinia** — state management
- **Vue Router** — routing with auth guards
- **TailwindCSS** — styling
- **TanStack Query** — server state
- **Axios** — HTTP client with auto Bearer injection

## Key Layers

| Layer       | Path               | Purpose                                            |
| ----------- | ------------------ | -------------------------------------------------- |
| Views       | `src/views/`       | AuthorizedView + UnauthorizedView layout           |
| Router      | `src/router/`      | Routes with meta-based auth, lazy loading          |
| Stores      | `src/stores/`      | authStore, loadingStore, circleStore               |
| Services    | `src/services/`    | Static async classes wrapping Axios                |
| Composables | `src/composables/` | usePolling, useLoading, useEmail                   |
| Components  | `src/components/`  | UI primitives + feature components                 |
| Helpers     | `src/helpers/`     | Browser wrappers (Window, LocalStorage, Clipboard) |

## Web3 Integration

- **Primary wallet:** ZeroDev — ERC-4337 smart accounts with passkey authentication
  - `@zerodev/sdk` — kernel account client
  - `@zerodev/webauthn-key` + `@zerodev/passkey-validator` — passkey auth
  - `@zerodev/ecdsa-validator` — ECDSA signing
  - `@zerodev/permissions` — session keys
- Wallet state in `zerodevStore` (Pinia)
- User operations via bundler, not traditional signed transactions
- Paymaster integration for sponsored (gasless) transactions
- **Secondary wallets:** Platform designed to support any wallet in future
- Never access `window` directly — use helpers

## Commands

```bash
yarn dev              # Dev server on port 4831
yarn build            # Production build
yarn test:unit        # Run unit tests
yarn test:cov         # Tests with coverage
yarn lint             # All linters
yarn fix              # Auto-fix
yarn type-check       # TypeScript only
```

## Code Standards

- Follow existing component patterns — read before writing
- Use Composition API with `<script setup lang="ts">`
- Use helpers instead of browser globals
- Test logic in composables, not in components
- Responsive: mobile-first with Tailwind breakpoints

## Before You Finish

- [ ] Code compiles (`yarn type-check`)
- [ ] No lint violations (`yarn lint`)
- [ ] Follows existing patterns
- [ ] Responsive on mobile and desktop
