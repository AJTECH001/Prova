# Slither Static Analysis — Triage

**Tool:** Slither 0.11.3 · **Scope:** `src/**` (mocks, tests, and `node_modules` excluded via `slither.config.json`)
**Run:** `pnpm --filter reineira-code exec slither .` (or `slither .` from `contracts/`)
**Result (latest 2026-06-30, after production-hardening pass — two-step ownership, new-business-only pause, `TestnetCoreBase`→`CoreBase` rename):** 86 contracts analyzed, 37 detector results. **No High or Medium severity vulnerabilities.** The hardening additions produce **no new findings**: the new `pause`/`unpause`/`acceptOwnership`/`whenNotPaused` surface is flagged by zero detectors; the +2 contract count is only OZ's `Ownable2StepUpgradeable`/`PausableUpgradeable` entering compilation; the `CoreBase` rename preserved the `reineira.storage.TestnetCoreBase` ERC-7201 slot string (upgrade-safe). The reentrancy results remain the accepted CoFHE-TaskManager pattern (trusted coprocessor calls via `FHE.allow`/`FHE.asEuint*`, not attacker-reachable). _(Prior: 2026-06-29 84 contracts/37 after Phase-0 grace + disputed-debt seam; 82/37 after M-SC1; baseline 2026-06-28 80/38.)_ The only finding on recently-added code remains the accepted `_param` naming convention on `TradeInvoiceResolver.setPaymentOracle`.

This document triages every category. Re-run after contract changes and update accordingly.

---

## Fixed

| Detector | Location | Action |
|---|---|---|
| `missing-zero-address-validation` | `OracleDebtorProof` constructor `initialOracle` | Added a zero-address check, mirroring `setOracle`. |
| `uninitialized-local-variables` | `TradeCreditInsurancePolicy.onPolicySet` `escrowId` | Made the default explicit (`uint256 escrowId = 0`); 0 means "no escrow id" and is handled below. |

---

## Accepted — by design (with rationale)

### `reentrancy-*` — FHE coprocessor + trusted registry calls
Slither treats CoFHE operations (`FHE.asEuintX`, `FHE.allow`, `FHE.lte`, …) as external calls and flags
subsequent state writes / events as reentrancy (in `judge`, `setScore`, `setCountryRisk`, `setIndustryRisk`).
- The CoFHE precompile/coprocessor is trusted infrastructure and cannot re-enter application contracts.
- The only application-level external calls (`judge` → `lossHistory.logClaim`, `exposureRegistry.reduceExposure`)
  target **owner-registered, whitelisted** protocol contracts, not arbitrary addresses. `judge` performs no
  security-critical state mutation after these calls (the trailing `try/catch` only emits an event).
- **Accepted.** Defense-in-depth (a `nonReentrant` guard on `judge`) is tracked as a future hardening item.

### `block-timestamp` — `TradeInvoiceResolver`
The protracted-default claim window is intentionally time-based (`dueDate`, `waitingPeriod` of 30–180 days).
Validator timestamp drift (~seconds) is negligible against multi-month windows. **Accepted.**

### `assembly-usage` — ERC-7201 namespaced storage
Inline assembly is the canonical ERC-7201 (`erc7201:`) storage-slot pattern used by all upgradeable
contracts (`_policyStorage`, `_exposureStorage`, `_claimsStorage`, …). **Accepted.**

### `unused-return` — `evaluateRisk`
`(euint32 creditScore, ) = debtorProofAdapter.getScore(...)` intentionally ignores the attestation
timestamp. **Accepted.**

### `dead-code` — `TestnetCoreBase._msgData()`
Part of the ERC-2771 `_msgSender`/`_msgData` override pair required for meta-transaction correctness.
Removing it would break the Context override contract. **Accepted.**

### `conformance-to-solidity-naming-conventions`
Flags intentional, ecosystem-standard conventions:
- `__gap` — OpenZeppelin upgradeable storage gap (reserved slots; "never used" by design).
- `__TestnetCoreBase_init` / `__*_init` — OpenZeppelin initializer naming convention.
- `_debtorProofAdapter`, `_escrowContract`, … — leading underscore distinguishes initializer/constructor
  parameters from storage. **Accepted.**

### `unused-state-variable` — `__gap`
Storage gaps are deliberately unreferenced; they reserve layout space for future upgrades. **Accepted.**

---

## Notes
- `slither.config.json` filters `node_modules`, `src/mocks`, `artifacts`, `cache`, `fhe-assistant` so results
  focus on production contracts (verified: 0 results in those paths).
- CI runs Slither via `crytic/slither-action` (currently advisory / `fail-on: none`); promote to blocking once
  this triage is reviewed and any future High/Medium findings are addressed.
