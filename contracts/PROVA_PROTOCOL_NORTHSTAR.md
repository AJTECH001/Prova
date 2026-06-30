# PROVA — Protocol Architecture & On-Chain/Off-Chain Boundary

**Status:** Committed positioning (2026-06-30) · architecture for approval · no implementation this turn
**Companion to:** `contracts/SMART_CONTRACT_DESIGN.md` · grounded in `prova-knowledge-base/07_technical/02` (surface review) + `/00` (backend blueprint)
**Supersedes:** the prior "multi-tenant on-chain overlay" draft of this file — that over-built the on-chain surface (see §6).

> **Citations:** `[SCR]` = `07_technical/02-smart-contract-surface-review.md` · `[BLU]` = `07_technical/00-backend-architecture-blueprint.md` · `[DEC]` = `10_decisions_log/decisions.md`.

---

## 0. Positioning (committed — `[DEC]` 2026-06-30)

**Prova is trade credit infrastructure for existing big firms.** Trade credit insurers, insurance companies, financial institutions, underwriters, and risk providers plug into Prova to **issue, manage, and settle trade credit insurance on-chain** and 10× their productivity. **Prova powers incumbents; it does not compete with them.** (One position — the earlier "against incumbents" framing is retired.)

Two boundaries this positioning does **not** change:
1. **Non-custodial, not an insurer** `[BLU §1, DEC]`. Premiums, pools, and payouts live in Reineira's `PremiumPool`/pUSDC. Prova contracts emit **decisions** Reineira consumes; Prova never holds or moves funds.
2. **Plugin author, not protocol author** `[SCR §19]`. Prova writes `IUnderwriterPolicy` + `IConditionResolver` plugins and their thin support contracts. Nothing else.

**The load-bearing consequence:** serving big firms is an **off-chain** story (onboarding, APIs, permissions, config, per-insurer deployment). It adds **zero** new on-chain contracts. The on-chain surface stays minimal `[SCR §161]`.

---

## 1. The boundary rule

> **On-chain only what needs blockchain trust** — authority to move pooled capital, immutable settlement, or a tamper-proof solvency bound. **Everything the backend can be trusted to do, the backend does.** `[SCR §2, §47]`

This single rule decides every contract question below — and it is exactly the "don't put backend work on-chain" constraint.

---

## 2. ✅ ON-CHAIN — the minimal set (the only contracts Prova builds)

| Contract | Interface | Why it MUST be on-chain (blockchain trust) | Source |
|---|---|---|---|
| `TradeCreditInsurancePolicy` | `IUnderwriterPolicy` | The decision that **authorizes payout from pooled capital** — the backend cannot be trusted to release the pool | `[SCR §49]` |
| `TradeInvoiceResolver` | `IConditionResolver` | **Releases escrowed funds** on a verifiable condition — settlement must be immutable & public | `[SCR §50]` |
| `DebtorExposureRegistry` | — | Concentration cap = **the one solvency control the backend must NOT be trusted to enforce alone** | `[SCR §68]` |
| `OracleDebtorProof` | `IDebtorProof` | Thin bridge landing an **encrypted score handle** for FHE math; scoring stays off-chain | `[SCR §53]` |
| `ManualPaymentAttestation` | `IPaymentOracle` | Consumes the **attested non-payment fact** — closes the time-only resolver gap (KB's #1 risk) | `[SCR §133]` |
| `DisputeAttestation` | `IDisputeOracle` | Enforces the **disputed-debt exclusion** in `judge` | derived (AU+SA research) |

Plus the interfaces, bases (`UnderwriterPolicyBase`, `ConditionResolverBase`), and risk libs (`RiskMathLib`, `FHERiskMath`, `FHEMeta`). **That is the whole on-chain footprint** `[SCR §161]`.

`InsuranceClaimsRegistry` is a **downgrade candidate** → off-chain loss store + optional periodic on-chain commitment `[SCR §69, §124]`.

---

## 3. ❌ OFF-CHAIN — the backend owns these (keep them OUT of contracts)

This is where the **"existing big firms plug in"** layer lives. None of it is a contract.

| Concern | Why off-chain | Source |
|---|---|---|
| **Insurer/partner onboarding, permissions, whitelisting** | *"Handled by backend OAuth / api-credentials. **No contract.**"* — this directly governs how big firms integrate | `[SCR §71]` |
| **Risk scoring** (the 4-signal model) | Runs in the backend; only the *encrypted result* touches chain | `[SCR §66, BLU §6]` |
| **Underwriting orchestration** — quote / issue / track / resolve, pricing inputs | Coordination layer, not trust boundary | `[BLU §2]` |
| **Default-verification determination** | Backend determines truth and submits it via the oracle; the contract only *consumes* the attested fact | `[BLU §10B]` |
| **Loss history as a data store** (the moat) | Better off-chain + commitment | `[SCR §69]` |
| **Product catalog / discovery / dashboards / B2B API** | Indexer + API concern | `[BLU §5, §12]` |
| **KYC/PII, verification pipeline, ledger/ERP ingestion, trade graph** | Off-chain data + compliance | `[SCR §72, BLU §12]` |

---

## 4. 🚫 NEVER BUILD — Reineira / Fhenix already own it

- **Reineira:** escrow, coverage manager, pool/LP, pUSDC settlement, ERC-2771 forwarder, upgrade host `[SCR §100]`.
- **Fhenix/CoFHE:** encryption, ciphertext validation, ACL, decryption `[SCR §86]`.

Any Prova contract that looks like escrow, pool, token, settlement, forwarder, encryption, or an ACL/proof verifier is duplication and must not exist.

---

## 5. How a big firm plugs in (the 10× story — entirely off-chain + one deploy)

1. **Onboard** (backend): the firm is approved, gets API credentials & permissions — **no contract** `[SCR §71]`.
2. **Configure** (per-instance, owner-set): premium curve, country/industry add-ons, concentration caps, grace window, oracle bindings — on *their own* policy/resolver instance.
3. **Deploy** (ops): one `TradeCreditInsurancePolicy` + `TradeInvoiceResolver` instance for the firm. The contract is already `initialize`-based / clone-ready, so this is a deployment action, **not** new code.
4. **Operate** (backend ↔ chain): the firm's systems call Prova's API; the backend prices on encrypted data, drives Reineira escrow/coverage, and reads the on-chain **decisions** (premium, claim-valid, condition-met).

The firm gets programmable, minutes-to-settlement, FHE-priced, solvency-capped coverage rails. **None of that required a new on-chain contract** — which is the proof the boundary is right.

---

## 6. Multi-tenancy = per-instance deployment, NOT an on-chain overlay (correction)

The earlier draft of this doc proposed on-chain `ProvaInsurerRegistry` / `ProvaProductFactory` / `ProvaProductRegistry` / `ProvaAccessController` / `ProvaPauser`. **Re-grounded against `[SCR §71]`, that was an over-build:** insurer whitelisting/permissions and product discovery are **backend** concerns, not blockchain-trust state.

**Committed model:** one policy+resolver **instance per insurer** (deployment/ops); per-instance `Ownable2Step` for the firm's own config; all curation, permissions, catalog, and RBAC in the **backend**. Today's single instance is tenant #1 — single-tenant first is a true subset, no rewrite. An on-chain factory is justified *only* if we ever need **trustless permissionless** insurer self-deployment, which we do not while Prova controls onboarding.

---

## 7. Security boundary highlights (full per-module review at build)

Prova never custodies funds, so the dominant surface is **oracle trust** and **per-instance isolation**, not value-extraction reentrancy.

- **Oracle trust (highest):** payment-truth / dispute / debtor-proof oracles are **owner/governance-set, never user-supplied** (already enforced); pilot manual attestor → zkTLS Reclaim; add staleness + nonce; consider M-of-N for production. `[SCR §133, BLU §8]`
- **Access control:** `onlyProvaContract` (CCM whitelist), `onlyBoundManager`/`onlyBoundEscrow` per-instance binding, `Ownable2Step` per firm.
- **Confidentiality:** FHE-encrypted premium/credit-limit/curve → no plaintext pricing to front-run `[SCR §81]`.
- **Solvency:** on-chain concentration cap via `FHE.select`; hard per-buyer/per-policy caps from day one `[SCR §68, BLU §11]`.
- **`isConditionMet`** stays `view` and < 50k gas (CLAUDE.md). Storage: ERC-7201 namespaced + `__gap`.
- **Audit gate:** real audit before mainnet — non-negotiable `[BLU §8]`.

---

## 8. North-star policy extensions (DEFERRED — design only)

From the Atradius UK research, two TCI primitives not yet modeled (surface as GAPs, build only when approved):
- **Discretionary Credit Limit (DCL):** per-policyholder threshold under which coverage binds without a fresh carrier/FHE decision — an on-chain delegated-authority rule (distinct from the carrier-set encrypted credit-limit that caps *payout*).
- **Modular structuring:** risk-share / deductible / ledger-selection params that scale the bound payout.

---

## 9. Open decisions (resolve before the relevant build)

1. **Instance config delivery** — owner-set on-chain params (today) vs off-chain-signed params `[SCR §70]`. *(Lean: keep critical caps on-chain; trim curve config toward off-chain-signed.)*
2. **Concentration scope** — `DebtorExposureRegistry` per-insurer vs cross-insurer-global cap (confidentiality vs systemic control). *(Lean: per-insurer default, opt-in shared view.)*
3. **Claims registry** — keep on-chain encrypted vs off-chain + commitment `[SCR §124]`. *(Lean: off-chain + commitment.)*
4. **Governance** — multisig/timelock owner for mainnet `[SCR §145]`.
5. **Payment-truth oracle** — zkTLS data source + NG-corridor provider availability; manual attestor is pilot-only `[BLU §8]`.

---

## 10. Recommendation & build fence

**NOW (single-tenant, minimal on-chain set):** harden the §2 contracts to institution-grade; retire the deployed mock; clear the pre-mainnet backlog (claims-registry downgrade, governance owner, zkTLS attestor when Reineira's package ships, fuzz/invariant tests). **Tenant #1 = the first big-firm/pilot deployment.**

**OFF-CHAIN (parallel, backend):** the "big firms plug in" layer — onboarding, permissions, API, config, per-insurer deployment automation.

**DEFERRED:** §8 policy extensions; any on-chain factory (only if trustless self-deployment becomes a real requirement).

No contract code is written until the §1 boundary and the §2 set are approved — so we never put backend work on-chain and never build ahead of the documented product.
