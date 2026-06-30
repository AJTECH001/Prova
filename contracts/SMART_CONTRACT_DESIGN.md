# PROVA — Smart Contract Design Document

**Status:** Proposed — awaiting approval before implementation
**Author:** Lead Smart Contract Architect pass
**Date:** 2026-06-28
**Grounded in:** `prova-knowledge-base/` (strategy synthesis, smart-contract surface review, backend blueprint, product roadmap, decisions log) and the live `contracts/` codebase.

> **Method note.** Every primitive below is derived from a documented business requirement and cited.
> Where the documentation does not support a requirement, it is listed in **§6 Gaps** rather than invented.
> Citations: `[SYN]` strategy synthesis · `[SCR]` 07_technical/02 surface review · `[BLU]` 07_technical/00 backend blueprint · `[ROAD]` product roadmap · `[DEC]` decisions log.

---

## 0. Framing — what Prova is, on-chain

Two load-bearing facts constrain the entire design:

1. **Prova is infrastructure, not an insurer — non-custodial, unregulated** `[DEC, SYN]`. On-chain primitives are *coverage / protection / liquidity pool / settlement / premium*, never "policy underwriting as a balance-sheet insurer."
2. **Prova is a plugin author, not a protocol author** `[SCR §19]`. **ReineiraOS** owns escrow, pooled capital, LP staking, pUSDC settlement, the ERC-2771 forwarder, and the upgrade host. **Fhenix/CoFHE** owns confidential compute, ciphertext validation, and ACL. Prova writes **only** the `IUnderwriterPolicy` + `IConditionResolver` plugins (and the thin registries/adapters they need).

**Consequence — the hard "do not build" list** `[SCR §90–100]`: no Prova escrow, pool/vault, token/wrapper, settlement, forwarder, on-chain ACL, encryption, or proof-verification contract. The roadmap additionally **rejects Web3 maximalism** — no tokens, NFTs, or coverage-NFT contract `[ROAD "Reject outright"]`.

The on-chain footprint is therefore deliberately tiny. This document's job is *subtraction and hardening*, plus closing **one** real gap, not adding surface.

---

## 1. On-Chain Responsibilities

Only state that needs **blockchain trust** — i.e. authority to move pooled capital, immutable settlement, or a tamper-proof solvency bound — belongs on-chain. Five responsibilities qualify; four already exist as contracts, one is missing.

### 1.1 The underwriting decision binding — `TradeCreditInsurancePolicy` (`IUnderwriterPolicy`)
- **Why on-chain:** it is the trust boundary that authorizes a payout from *pooled capital*; the backend cannot be trusted to release the pool `[SCR §49]`.
- **Business requirement:** FHE-priced coverage decision; bound, encrypted per-buyer credit limit caps the payout `[BLU §6, ROAD 1.2]`.
- **Actors:** ReineiraOS Coverage Manager (invokes `evaluateRisk`/`judge`); backend operator (owner: sets curve, country/industry add-ons, concentration caps, debtor-proof adapter).
- **Data owned:** encrypted policy params (`euint64` credit limit, `ebool` cap-valid flag), `debtorId`→pool binding, encrypted curve thresholds/premiums, plaintext concentration caps, `escrowId`→policy index. Risk/pricing **never** in plaintext `[SCR §81]`.
- **Events:** `PolicySet`, `CurveUpdated`, `CountryRiskSet`, `IndustryRiskSet`, `ClaimLogFailed`.
- **Permissions:** `onlyProvaContract` (whitelisted caller) for `onPolicySet`/`evaluateRisk`; `onlyBoundManager` for `judge`; `onlyOwner` for parameter admin.

### 1.2 The claim-open trigger — `TradeInvoiceResolver` (`IConditionResolver`)
- **Why on-chain:** it releases escrowed funds on a verifiable condition; settlement must be immutable and publicly verifiable `[SCR §50]`.
- **Business requirement:** protracted-default claim window after invoice due date `[BLU §10]`.
- **Actors:** ReineiraOS escrow (the only bound caller); backend (submits invoice time terms at creation).
- **Data owned:** **time parameters only** (`dueDate`, `waitingPeriod`); party identities/amounts are validated then discarded for privacy; canonical invoice-hash for double-insurance prevention.
- **Events:** `ConditionSet`, `EscrowContractSet`, `ConditionFeeSet`.
- **Permissions:** `onlyBoundEscrow` for `isConditionMet`; caller-bound `onConditionSet`; `onlyOwner` for escrow address + fee config.
- **⚠️ Known integrity gap:** it is **time-only** — it never proves the buyer actually failed to pay. See §1.5 and §6.1.

### 1.3 The solvency guardrail — `DebtorExposureRegistry`
- **Why on-chain:** concentration caps are the central solvency control; on-chain enforcement stops the backend from over-allocating the pool `[SCR §51, BLU §42]`. This is *the one thing the backend must not be trusted to enforce alone* `[SCR §68]`.
- **Business requirement:** hard per-buyer caps from day one; a single large default must not exceed the pool `[ROAD H2 watch-items, BLU §11]`.
- **Actors:** the policy plugin (whitelisted writer); owner (registers writers).
- **Data owned:** encrypted aggregate per-debtor exposure total (`euint64`); cap enforced entirely in FHE via `FHE.select`.
- **Events:** `ContractRegistered`, `ContractDeregistered`.
- **Permissions:** writer whitelist (`onlyOwner` to manage); `NotRegisteredContract` guard on writes.
- **Trim candidate:** per-pool analytics buckets are *not* used for cap enforcement — reconstruct off-chain from events `[SCR §125]`.

### 1.4 The encrypted-score bridge — `OracleDebtorProof` (`IDebtorProof`)
- **Why on-chain (thin):** lands an *encrypted* credit-score handle the policy can compute on via FHE without decryption; scoring itself stays off-chain `[SCR §53]`.
- **Business requirement:** FHE risk engine prices on an encrypted score; the 4-signal model runs in the backend `[BLU §6]`.
- **Actors:** backend = the oracle (submits encrypted score); policy (reads handle via `getScore`).
- **Data owned:** `euint32` score + timestamp per `debtorId`, validated by the CoFHE TaskManager.
- **Events:** `ScoreSet`, `OracleUpdated`.
- **Permissions:** `onlyOracle` (oracle or owner) submits; ciphertext structure validated.

### 1.5 **MISSING** — payment-truth verification (zkTLS condition)
- **Why on-chain:** a claim must release pooled capital only on a *verifiable* fact about payment; today the resolver assumes non-payment from elapsed time alone `[SCR §133, BLU §B]`.
- **Business requirement:** "did the buyer actually not pay?" is named the **single most important unsolved technical risk** `[BLU §8, MSA §54]`; the resolver carries 4 in-code TODOs pointing at this layer `[SCR §23]`.
- **What ReineiraOS provides (checked 2026-06-28 via reineira-docs MCP):**
  - ❌ **No drop-in oracle contract.** Generic `OracleResolver` (Chainlink/UMA) and generic `zkTLSResolver` are **TODO** in the platform — *not built*. No Reclaim/Chainlink/UMA verifier is in Reineira's deployed Escrow set.
  - ✅ **Building blocks exist:** **`ReclaimConditionBase`** (zkTLS base, "already present in the codebase") and an **implemented `PayPalConditionResolver`** — *zkTLS proof of payment capture* — in `packages/escrow/contracts/plugins/`. The platform's verification table maps **zkTLS (Reclaim) → "a real-world payment was received"**, while oracle feeds (Chainlink/UMA) are for *price thresholds* — wrong tool for "did buyer X pay invoice Y."
- **Shape (refined):** **extend Reineira's `ReclaimConditionBase`**, modeled on the implemented `PayPalConditionResolver`, to verify a Reclaim zkTLS attestation of payment over the seller's payment data source — *not* a from-scratch oracle, *not* a (non-existent) Reineira oracle to merely consume.
- **Status:** **the one net-new primitive this design proposes to build** — see §3.5 and §7.

---

## 2. Off-Chain Responsibilities (and why)

| Responsibility | Why NOT on-chain | Where it lives |
|---|---|---|
| **Risk *scoring*** (4-signal model: payment rate, DSO, volume, default rate, tenure) | Only the *encrypted result* needs chain trust; the computation is private business logic `[SCR §66, BLU §6]` | Backend → `OracleDebtorProof` |
| **Loss-history / claims log** | Its own NatSpec says it should move off-chain; it's a *data moat* better stored off-chain with an optional periodic on-chain commitment `[SCR §52, §124]` | Backend store (+ optional Merkle commitment) — see §6.4 |
| **Underwriting parameters** (curve, country/industry add-ons) | Defensible on-chain for privacy today, but a candidate to slim toward off-chain-signed params `[SCR §70]` | On-chain now; review for mainnet |
| **Trade graph / relationship edges** (the moat) | A graph store; at most future on-chain *commitments*, not a contract `[SCR §72, SYN L0]` | Backend (future) |
| **KYB / verification pipeline** (existence, compliance, fraud, shared fraud memory) | Data + process; PII must not be on a public ledger `[BLU §C, SYN L1]` | Backend (future) |
| **Partner permissions / API keys** | OAuth/api-credentials, no chain trust needed `[SCR §71]` | Backend (already built) |
| **Payment settlement (money movement), escrow lifecycle, LP pool/staking, pUSDC** | **Provided by ReineiraOS** — rebuilding is duplication `[SCR §94–100]` | ReineiraOS |
| **Encryption, ciphertext ACL, input-proof verification** | **Provided by Fhenix/CoFHE** | Fhenix TaskManager |

---

## 3. Contract Architecture

### 3.1 Module map (target)
```
Plugins (Prova writes these)
  TradeCreditInsurancePolicy   — IUnderwriterPolicy  — decision + cap gating
  TradeInvoiceResolver         — IConditionResolver  — claim-open trigger
Registries (support the plugins)
  DebtorExposureRegistry       — encrypted solvency cap (concentration)
Adapters (off-chain → FHE bridges, IDebtorProof)
  OracleDebtorProof            — encrypted credit-score handle
  PaymentTruthAttestation      — encrypted/verified non-payment fact   ← NEW (§3.5)
Scaffolding (shared)
  interfaces:  IUnderwriterPolicy, IConditionResolver, IDebtorProof
  bases:       UnderwriterPolicyBase, ConditionResolverBase, CoreBase (rename from TestnetCoreBase)
  libs:        RiskMathLib, FHERiskMath, FHEMeta
Consumed (do NOT build):  ReineiraOS escrow/pool/settlement/forwarder · Fhenix FHE/ACL/TaskManager
```

### 3.2 State (per contract) — already implemented except §3.5
ERC-7201 namespaced storage throughout (collision-safe, upgrade-safe). Encrypted fields are CoFHE handles (`euint*`/`ebool`), never plaintext. Storage gaps (`__gap`) reserved on every upgradeable contract.

### 3.3 Instructions / external functions (the minimal ABI)
- **Policy:** `onPolicySet`, `evaluateRisk`, `judge` (plugin ABI) · `setCurve`, `setCountryRisk`, `setIndustryRisk`, `setConcentrationCap`, `setDebtorProofAdapter` (owner).
- **Resolver:** `onConditionSet`, `isConditionMet`, `getConditionFee` (plugin ABI) · `setEscrowContract`, `setConditionFee` (owner).
- **ExposureRegistry:** `addExposure`, `reduceExposure` (whitelisted writer) · `registerContract`, `deregisterContract` (owner) · `isRegistered` (view).
- **OracleDebtorProof:** `setScore` (oracle) · `getScore` (policy) · `hasScore` (view) · `setOracle` (owner).
- **PaymentTruthAttestation (new):** `attest`/`submitProof` (oracle/zkTLS) · `isNonPaymentProven(escrowId)` (view, consumed by resolver) · `setOracle` (owner).

### 3.4 Access control, upgrade, data relationships
- **Access control:** `onlyOwner` admin · caller-binding (`onlyBoundEscrow`/`onlyBoundManager`, first caller wins) · moat whitelist (`onlyProvaContract`) · oracle gate. **All mutating paths are gated** — verified by the M2 test-suite (84 tests).
- **Upgrade strategy:** UUPS via `CoreBase` (OpenZeppelin upgradeable, `_authorizeUpgrade` = `onlyOwner`), ERC-7201 storage + `__gap`. Rename `TestnetCoreBase`→`CoreBase` before mainnet `[SCR §134]`.
- **Data relationships:** escrow ⟶ resolver (`escrowId`→time terms) and escrow/coverage ⟶ policy (`escrowId`/`coverageId`→encrypted policy); policy ⟶ exposure registry (writer) and ⟶ debtor-proof adapter (reader); resolver ⟶ **payment-truth adapter** (new dependency).

### 3.5 The one new capability — payment-truth via zkTLS (`ReclaimConditionBase`)
- **Approach:** extend Reineira's **`ReclaimConditionBase`** (reference: the implemented `PayPalConditionResolver`) to verify a Reclaim zkTLS attestation that a given invoice *was paid*. Configure provider hashes + field-extraction (amount/sender/reference) for the seller's payment data source.
- **Claim semantics (note the "prove a negative" nuance):** zkTLS proves a *positive* (payment captured). The protracted-default claim therefore opens when *the window has elapsed **and** no valid payment proof exists*; submitting a valid Reclaim payment proof **blocks/closes** the claim (payment happened). This inverts the `PayPalConditionResolver` pattern and must be designed explicitly.
- **Two implementation options (decide at approval):**
  - **(a)** Re-architect `TradeInvoiceResolver` to inherit `ReclaimConditionBase` — `isConditionMet` = window elapsed AND no payment proof. Fewer moving parts; changes an audited contract.
  - **(b)** A companion proof sink (extends `ReclaimConditionBase`) that the resolver reads — keeps `TradeInvoiceResolver` smaller but adds a contract + a cross-call.
- **Trust source:** **Reclaim zkTLS** (platform-sanctioned for payment facts; Chainlink/UMA are price-threshold tools, not payment proof).

---

## 4. Business Flow Validation

**Flow A — coverage issuance → settlement** `[BLU §10]`:
1. Seller creates invoice → ReineiraOS escrow `create()` calls `resolver.onConditionSet` (time terms) and `policy.onPolicySet` (encrypted params). ✅ supported.
2. Backend submits encrypted score → `OracleDebtorProof.setScore`. ✅
3. Coverage Manager calls `policy.evaluateRisk` → encrypted premium via the FHE curve; `policy.onPolicySet`→`exposureRegistry.addExposure` enforces the cap (`ebool`). ✅
4. Buyer pays → escrow settles normally (ReineiraOS). ✅
5. Buyer defaults → claim window opens → escrow checks `resolver.isConditionMet` → **on true**, ReineiraOS pays the seller from the pool; `policy.judge` validates the claim, logs loss, reduces exposure. ✅ *contractually*, **but see the broken link below.**

**Broken link (validated):** Step 5's `isConditionMet` returns true on **elapsed time alone** — a buyer who *did* pay off-chain (or a seller filing falsely) is indistinguishable on-chain. The flow **cannot be completed safely** without the **payment-truth primitive (§1.5/§3.5)**. This is the single missing primitive; everything else validates against the existing contracts.

**Flows explicitly out of scope now** (documentation-gated): LP capital markets/tokenization (Web3-maximalism rejected) `[ROAD]`; partner/insurer API integration on-chain (Horizon 3, off-chain) `[BLU §5, ROAD 3.1]`; financing edge (Horizon 3+) `[SYN §212]`.

---

## 5. Security Review (pre-implementation)

| Risk | Assessment | Mitigation |
|---|---|---|
| **Authorization** | Strong: every mutating path is owner-/caller-/oracle-gated; FHE ACL via Fhenix | Keep; add per-function review for the new adapter |
| **Privilege escalation / centralization** | ⚠️ Heavy `onlyOwner` (single key sets curves, caps, oracle, adapter, upgrades) `[SCR §145]` | Move owner to a **multisig/timelock** before mainnet; consider role separation (param-admin vs upgrade-admin) |
| **Invalid state transitions** | Caller-binding prevents re-init/replay of `onPolicySet`/`onConditionSet`; `set` guards on uninitialised reads | Keep; covered by M2 tests |
| **Replay / double execution** | Invoice-hash dedupe (double-insurance) + escrow-id 1:1 binding | Keep; add nonce/idempotency review to the attestation adapter |
| **Data integrity** | Encrypted state + TaskManager ciphertext validation; anti-enumeration keys in claims log | Keep |
| **Claim integrity (the big one)** | 🔴 Time-only resolver = false/again-paid claims can drain the pool `[SCR §23]` | **Build §3.5 payment-truth adapter** (highest priority) |
| **Upgrade risk** | UUPS + ERC-7201 + `__gap` correct; but upgrade key = same single owner | Multisig/timelock; storage-layout CI check before each upgrade |
| **Integration risk** | Hard dependency on ReineiraOS + Fhenix roadmaps `[BLU §7]`; mock adapter still in the deployed set `[SCR §22]` | Pin platform versions; retire `MockDebtorProof` from prod deploy profile |
| **Audit** | **Unaudited**; mainnet is gated on a real audit `[BLU §8]` | Tier-1 audit before Arbitrum One; Slither triage already on file (`slither-triage.md`, 0 High/Med) |

**M-SC1 module security review (manual seam, 2026-06-29):**
- *Authorization* — `attestPayment` is `onlyAttestor` (attestor or owner); `setAttestor`/`setPaymentOracle` are `onlyOwner`. ✅
- *Attestor trust (inherent, pilot)* — a compromised attestor could suppress a legitimate claim (mark paid) or fail to record a real payment (enable a wrongful claim). This is the explicit trust of the manual pilot path; net it is **strictly better than time-only** (a claim now needs window-elapsed AND not-paid) and is removed entirely by the zkTLS successor. Bound the attestor key (backend wallet); rotate via owner.
- *External call in `isConditionMet`* — calls only the **owner-configured** oracle (never user-supplied), a `view` staticcall to a trivial non-reverting getter; safe per the resolver checklist. A future hardening could `try/catch` to avoid redemption DoS if a misconfigured oracle reverts.
- *Upgrade safety* — the new `paymentOracle` field is **appended** to the ERC-7201 `ResolverStorage` struct (its own namespaced slot; `__gap` intact) — upgrade-safe.
- *Slither* — re-run 2026-06-29: 0 High/Med; only the accepted `_param` naming convention on `setPaymentOracle`.

---

## 6. Documentation Gaps & Ambiguities (decisions required before/within build)

1. **Payment-truth mechanism — largely resolved by the Reineira check (2026-06-28).** Mechanism = **Reclaim zkTLS via `ReclaimConditionBase`** (platform-sanctioned for payment facts; `PayPalConditionResolver` is a working reference). Remaining decisions: **(i)** implementation option **(a)** inherit base into `TradeInvoiceResolver` vs **(b)** companion proof sink (§3.5); **(ii)** the **payment data source** to attest (bank statement portal / payment processor / mobile-money API) and its Reclaim provider availability in NG corridors; **(iii)** pilot fallback — manual/centralized attestation until a zkTLS provider is wired `[BLU §B]`. Chainlink/UMA are **not** the right tool here (price thresholds, not "did invoice Y get paid").
2. **"Insurers integrate their underwriting/policy/claims" (your prompt) vs documented strategy.** The roadmap places partner-facing rails/licensing at **Horizon 3 and off-chain** `[ROAD 3.1/3.3, BLU §5]`; today's posture is *against* incumbents. A **multi-tenant, insurer-integration on-chain surface is not documentation-supported as a now-build.** Decision: confirm whether to (a) stay single-product coverage now (recommended, doc-aligned) or (b) elevate multi-tenant integration to a current requirement (would need new product spec first).
3. **On-chain enforceable trade agreement** — the strategy synthesis calls a signed/timestamped agreement a first-class "build now" primitive `[SYN §202]`, but the surface review does **not** model it as a contract. Decision: is this satisfied by escrow + resolver terms + an off-chain signed doc with an on-chain hash commitment, or is a dedicated primitive required? (Recommend: hash-commitment, not a new contract — needs legal validation in NG corridors `[SYN §215]`.)
4. **Claims registry placement** — `InsuranceClaimsRegistry` should likely be **downgraded to off-chain store + periodic on-chain commitment** `[SCR §124]`. Decision: defer/slim before mainnet?
5. **Underwriting params on-chain vs off-chain-signed** — slim for mainnet? `[SCR §70]`
6. **Governance** — who holds owner on mainnet (multisig/timelock composition)? NSKB.

---

## 7. Minimum Viable Contract Set & Proposed Sequence

**Keep (already implemented + tested in M2):** `TradeCreditInsurancePolicy`, `TradeInvoiceResolver`, `DebtorExposureRegistry`, `OracleDebtorProof`, interfaces, bases, libs.

**Already done in prior hardening (M1–M6):** removed orphaned mocks (`MockUnderwriterPolicy`, `MockFHERiskMathExample`) and pruned unused `FHERiskMath` fns; 84-test suite; Slither triage (0 High/Med). *(`MockDebtorProof` retained — still referenced by deploy/ops scripts; retire from the prod deploy profile, §6.)*

**Phase-0 pilot-readiness — ✅ IMPLEMENTED 2026-06-29 (first-party, single-tenant; derived from the real TCI research + signed pilot LOI):**
- **Configurable grace window.** The signed Nigeria pilot LOI promises a **7-day grace**, but the resolver hard-coded a 30-day minimum. Replaced the `MIN_WAITING_PERIOD` constant with an owner-configurable `minWaitingPeriod` (default 30d) bounded by a hard `MIN_WAITING_PERIOD_FLOOR = 1 day` (anti-gaming) and `MAX_WAITING_PERIOD = 180d`. Owner calls `setMinWaitingPeriod(7 days)` for the pilot. Source: `04_customers/01-pilot-loi-package.md`.
- **Disputed-debt exclusion.** The #1 real-TCI exclusion (the insurable object is *undisputed* indebtedness — AU & SA research). Added `IDisputeOracle` + `DisputeAttestation` (manual pilot attestor, mirrors `ManualPaymentAttestation`) and wired `TradeCreditInsurancePolicy.judge`: a coverage the oracle reports as disputed forces `valid = false`. `address(0)` disables the gate. zkTLS dispute-resolution attestation drops in later via the same interface — no policy change. Source: `03_research/trade_credit_insurance_knowledge_base.md §5`, `trade_credit_2_analysis.md §6`.
- Tests: +19 (resolver grace 6, `DisputeAttestation` 11, policy dispute 3 — net) → **120 contract tests total**; solhint 0 errors.
- Strictly first-party single-tenant (B2B2X "prove with SMEs" phase). No multi-tenant / `ExternalDecisionPolicy` — deferred until a platform partner signs.

**M-SC1 — payment-truth seam — ✅ IMPLEMENTED 2026-06-29 (manual/pilot phase):**
- Added `IPaymentOracle` interface (`isPaid(escrowId)`) — vendored locally, consistent with the repo's interface convention.
- Added `ManualPaymentAttestation` (`adapters/`) — Ownable + attestor role; `attestPayment(escrowId, paid)`; the KB-sanctioned pilot path.
- Wired into `TradeInvoiceResolver`: `setPaymentOracle` (owner) + gate — `isConditionMet = window elapsed AND (oracle unset OR NOT isPaid(escrowId))`. `address(0)` = time-only (backward compatible; 84 prior tests unchanged).
- Tests: 17 new (ManualPaymentAttestation 11 + resolver gate 6/7) → **101 contract tests total**.
- **Deferred (blocked by external dependency):** the zkTLS implementation. `ReclaimConditionBase`/`PayPalConditionResolver` live in `@reineira-os/shared`+`escrow`, which are **not published to npm** and have **no deployed Reclaim verifier** on Arbitrum Sepolia (verified via reineira-docs + npm). A future `ReclaimPaymentAttestation implements IPaymentOracle` (extending `ReclaimConditionBase`) is a drop-in via the same seam — **no resolver change** — once that package/verifier is available. This is the chosen path; production MUST configure a real oracle (the time-only fallback is pilot-only).

**Then, pre-mainnet hardening (no new surface):**
- **M-SC2** — `TestnetCoreBase`→`CoreBase` rename + non-mock deploy profile (retire `MockDebtorProof`).
- **M-SC3** — owner → multisig/timelock; storage-layout upgrade CI check.
- **M-SC4** — downgrade `InsuranceClaimsRegistry` to off-chain + commitment; drop exposure analytics buckets (per §6.4/§1.3).

**Explicitly NOT building** (duplication or rejected): coverage-NFT, token, escrow, pool/vault, settlement, forwarder, on-chain ACL/encryption/proof contracts, financing/tokenization contracts.

---

## 8. Recommendation

Approve the **single net-new primitive (`PaymentTruthAttestation`, M-SC1)** as the next on-chain build — it is the one documented, validated gap that makes the coverage→settlement flow trustworthy — **conditioned on the §6.1 oracle decision**. Treat M-SC2–4 as pre-mainnet hardening. Resolve the §6 ambiguities (especially #2, the insurer-integration scope) before any architecture beyond M-SC1, so we never build ahead of the documented product.

**No code will be written until this design and the §6 decisions are approved.**
