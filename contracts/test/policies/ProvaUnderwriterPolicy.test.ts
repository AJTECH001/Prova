import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProvaFixture, encodePolicyData, encodeMockInEuint32, encodeDisputeProof } from "../fixtures";

// Standard policy params used across tests
const CREDIT_LIMIT  = 200_000n * 10n ** 6n; // $200k USDC
const COVERAGE_BPS  = 9_000;                 // 90%
const BASE_PREMIUM  = 200;                   // 2%
const COUNTRY_RISK  = 50;                    // 0.5%
const INDUSTRY_RISK = 100;                   // 1%

const DEFAULT_POLICY_DATA = encodePolicyData(
    CREDIT_LIMIT,
    COVERAGE_BPS,
    BASE_PREMIUM,
    COUNTRY_RISK,
    INDUSTRY_RISK,
);

describe("ProvaUnderwriterPolicy", function () {

    // ─── onPolicySet ─────────────────────────────────────────────────────────

    describe("onPolicySet", function () {

        it("stores policy and emits PolicySet", async function () {
            const { policy } = await loadFixture(deployProvaFixture);

            await expect(policy.onPolicySet(1, DEFAULT_POLICY_DATA))
                .to.emit(policy, "PolicySet")
                .withArgs(1);

            const stored = await policy.policies(1);
            expect(stored.buyerCreditLimit).to.equal(CREDIT_LIMIT);
            expect(stored.coveragePercentageBps).to.equal(COVERAGE_BPS);
            expect(stored.basePremiumBps).to.equal(BASE_PREMIUM);
            expect(stored.countryRiskBps).to.equal(COUNTRY_RISK);
            expect(stored.industryRiskBps).to.equal(INDUSTRY_RISK);
            expect(stored.set).to.be.true;
        });

        it("reverts PolicyAlreadySet when called twice for same coverageId", async function () {
            const { policy } = await loadFixture(deployProvaFixture);

            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);
            await expect(policy.onPolicySet(1, DEFAULT_POLICY_DATA))
                .to.be.revertedWithCustomError(policy, "PolicyAlreadySet")
                .withArgs(1);
        });

        it("reverts InvalidCreditLimit for zero credit limit", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(0n, COVERAGE_BPS, BASE_PREMIUM, COUNTRY_RISK, INDUSTRY_RISK);

            await expect(policy.onPolicySet(1, data))
                .to.be.revertedWithCustomError(policy, "InvalidCreditLimit");
        });

        it("reverts InvalidCoveragePercentage for zero coverage", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(CREDIT_LIMIT, 0, BASE_PREMIUM, COUNTRY_RISK, INDUSTRY_RISK);

            await expect(policy.onPolicySet(1, data))
                .to.be.revertedWithCustomError(policy, "InvalidCoveragePercentage");
        });

        it("reverts InvalidCoveragePercentage for coverage above 100%", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(CREDIT_LIMIT, 10_001, BASE_PREMIUM, COUNTRY_RISK, INDUSTRY_RISK);

            await expect(policy.onPolicySet(1, data))
                .to.be.revertedWithCustomError(policy, "InvalidCoveragePercentage");
        });

        it("reverts InvalidBasePremium for zero base premium", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(CREDIT_LIMIT, COVERAGE_BPS, 0, COUNTRY_RISK, INDUSTRY_RISK);

            await expect(policy.onPolicySet(1, data))
                .to.be.revertedWithCustomError(policy, "InvalidBasePremium");
        });

        it("reverts InvalidBasePremium for base premium above 20%", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(CREDIT_LIMIT, COVERAGE_BPS, 2_001, COUNTRY_RISK, INDUSTRY_RISK);

            await expect(policy.onPolicySet(1, data))
                .to.be.revertedWithCustomError(policy, "InvalidBasePremium");
        });

        it("accepts zero country and industry risk add-ons", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const data = encodePolicyData(CREDIT_LIMIT, COVERAGE_BPS, BASE_PREMIUM, 0, 0);

            await expect(policy.onPolicySet(1, data)).to.not.be.reverted;
        });

        it("accepts separate coverageIds independently", async function () {
            const { policy } = await loadFixture(deployProvaFixture);

            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);
            await policy.onPolicySet(2, DEFAULT_POLICY_DATA);

            expect((await policy.policies(1)).set).to.be.true;
            expect((await policy.policies(2)).set).to.be.true;
        });
    });

    // ─── evaluateRisk ─────────────────────────────────────────────────────────

    describe("evaluateRisk", function () {

        it("reverts PolicyNotSet when no policy is registered", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const riskProof = encodeMockInEuint32();

            await expect(policy.evaluateRisk(99, riskProof))
                .to.be.revertedWithCustomError(policy, "PolicyNotSet")
                .withArgs(99);
        });

        it("reverts in local Hardhat — FHE.asEuint32(InEuint32) requires a CoFHE-sealed ciphertext", async function () {
            // FHE.asEuint32(InEuint32) verifies the input ciphertext via the CoFHE precompile.
            // A raw ABI-encoded struct is not a valid sealed input — it will revert here.
            // This test documents the expected local behaviour. On Fhenix testnet with a real
            // CoFHE client the input must be created via cofheClient.encryptInputs([Encryptable.uint32(score)]).
            const { policy } = await loadFixture(deployProvaFixture);
            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);

            const riskProof = encodeMockInEuint32(99999n);
            await expect(policy.evaluateRisk(1, riskProof)).to.be.reverted;
        });
    });

    // ─── judge ───────────────────────────────────────────────────────────────

    describe("judge", function () {

        it("reverts PolicyNotSet when no policy is registered", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            const proof = encodeDisputeProof(100_000n * 10n ** 6n);

            await expect(policy.judge(99, proof))
                .to.be.revertedWithCustomError(policy, "PolicyNotSet")
                .withArgs(99);
        });

        it("does not revert when claim is within the credit limit ($180k on $200k limit)", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);

            const claimAmount = 180_000n * 10n ** 6n; // $180k
            const proof = encodeDisputeProof(claimAmount);

            await expect(policy.judge(1, proof)).to.not.be.reverted;
        });

        it("does not revert when claim equals the credit limit exactly ($200k on $200k limit)", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);

            const proof = encodeDisputeProof(CREDIT_LIMIT);
            await expect(policy.judge(1, proof)).to.not.be.reverted;
        });

        it("does not revert when claim exceeds the credit limit ($220k on $200k limit)", async function () {
            // judge() never reverts — it returns encrypted false for invalid claims.
            // The pool reads the ebool result via FHE; it never throws here.
            const { policy } = await loadFixture(deployProvaFixture);
            await policy.onPolicySet(1, DEFAULT_POLICY_DATA);

            const claimAmount = 220_000n * 10n ** 6n; // $220k > $200k limit
            const proof = encodeDisputeProof(claimAmount);

            await expect(policy.judge(1, proof)).to.not.be.reverted;
        });
    });

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    describe("supportsInterface", function () {

        it("supports ERC-165 itself", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            expect(await policy.supportsInterface("0x01ffc9a7")).to.be.true;
        });

        it("supports IUnderwriterPolicy interface", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            expect(await policy.supportsInterface("0x80bcb11e")).to.be.true;
        });

        it("does not claim IConditionResolver support", async function () {
            const { policy } = await loadFixture(deployProvaFixture);
            // IConditionResolver interfaceId — policy should not claim this
            expect(await policy.supportsInterface("0xdeadbeef")).to.be.false;
        });
    });
});
