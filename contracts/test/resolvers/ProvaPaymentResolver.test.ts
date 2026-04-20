import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployProvaFixture, encodeConditionData, DEFAULT_WAITING_PERIOD } from "../fixtures";

const INVOICE_AMOUNT = 200_000n * 10n ** 6n; // $200k USDC

describe("ProvaPaymentResolver", function () {

    // ─── onConditionSet ───────────────────────────────────────────────────────

    describe("onConditionSet", function () {

        it("registers condition and emits ConditionSet with only escrowId (T8)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            // Event emits only escrowId — no party addresses, amount, or date on-chain (T8).
            await expect(resolver.onConditionSet(1, data))
                .to.emit(resolver, "ConditionSet")
                .withArgs(1);
        });

        it("reverts ConditionAlreadySet when called twice for same escrowId", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            await resolver.onConditionSet(1, data);
            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "ConditionAlreadySet")
                .withArgs(1);
        });

        it("reverts InvalidBuyer for zero buyer address", async function () {
            const { resolver, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(ethers.ZeroAddress, seller.address, INVOICE_AMOUNT, dueDate);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidBuyer");
        });

        it("reverts InvalidSeller for zero seller address", async function () {
            const { resolver, buyer } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, ethers.ZeroAddress, INVOICE_AMOUNT, dueDate);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidSeller");
        });

        it("reverts InvalidSeller when buyer and seller are the same address", async function () {
            const { resolver, buyer } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, buyer.address, INVOICE_AMOUNT, dueDate);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidSeller");
        });

        it("reverts InvalidAmount for zero invoice amount", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, 0n, dueDate);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidAmount");
        });

        it("reverts InvalidDueDate for a due date in the past", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const pastDate = (await time.latest()) - 1;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, pastDate);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidDueDate");
        });

        it("reverts InvalidWaitingPeriod when waitingPeriod is below 1 day (R4)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const tooShort = 3600; // 1 hour — below MIN_WAITING_PERIOD
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate, tooShort);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidWaitingPeriod");
        });

        it("reverts InvalidWaitingPeriod when waitingPeriod exceeds 90 days (R4)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const tooLong = 91 * 24 * 60 * 60; // 91 days — above MAX_WAITING_PERIOD
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate, tooLong);

            await expect(resolver.onConditionSet(1, data))
                .to.be.revertedWithCustomError(resolver, "InvalidWaitingPeriod");
        });

        it("accepts separate escrowIds with different invoices independently (T9)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;

            // Different invoice data required — same hash would trigger InvoiceAlreadyRegistered (T9).
            const data1 = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            const data2 = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate + 86400);

            await expect(resolver.onConditionSet(1, data1)).to.not.be.reverted;
            await expect(resolver.onConditionSet(2, data2)).to.not.be.reverted;
        });

        it("reverts InvoiceAlreadyRegistered when same invoice is used for two escrowIds (T9)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            await resolver.onConditionSet(1, data);
            // Same invoice data = same hash → double-insurance attempt.
            await expect(resolver.onConditionSet(2, data))
                .to.be.revertedWithCustomError(resolver, "InvoiceAlreadyRegistered");
        });
    });

    // ─── isConditionMet ───────────────────────────────────────────────────────

    describe("isConditionMet", function () {

        it("returns false before due date", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            // Same signer (owner) who called onConditionSet is the bound escrow (T4).
            expect(await resolver.isConditionMet(1)).to.be.false;
        });

        it("returns false after due date but before waiting period ends", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            await time.increase(86400 + 1);

            expect(await resolver.isConditionMet(1)).to.be.false;
        });

        it("returns true after dueDate + default 7-day waiting period", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            await time.increase(86400 + DEFAULT_WAITING_PERIOD + 1);

            expect(await resolver.isConditionMet(1)).to.be.true;
        });

        it("uses per-escrow waiting period when set (R4)", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const shortPeriod = 3 * 24 * 60 * 60; // 3 days
            const data = encodeConditionData(
                buyer.address, seller.address, INVOICE_AMOUNT, dueDate, shortPeriod,
            );
            await resolver.onConditionSet(1, data);

            // Not yet ready after 2 days past due date.
            await time.increase(86400 + 2 * 24 * 60 * 60);
            expect(await resolver.isConditionMet(1)).to.be.false;

            // Ready after 3 days past due date.
            await time.increase(24 * 60 * 60 + 1);
            expect(await resolver.isConditionMet(1)).to.be.true;
        });

        it("reverts UnauthorizedCaller for unregistered escrowId (T4)", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            // No binding exists for escrowId 999 — any caller is unauthorized.
            await expect(resolver.isConditionMet(999))
                .to.be.revertedWithCustomError(resolver, "UnauthorizedCaller")
                .withArgs(999);
        });

        it("reverts UnauthorizedCaller when called by a non-bound address (T4)", async function () {
            const { resolver, buyer, seller, stranger } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            // stranger was not the caller of onConditionSet — must be rejected.
            await expect(resolver.connect(stranger).isConditionMet(1))
                .to.be.revertedWithCustomError(resolver, "UnauthorizedCaller")
                .withArgs(1);
        });
    });

    // ─── Constants & ERC-165 ─────────────────────────────────────────────────

    describe("constants and interface", function () {

        it("exposes DEFAULT_WAITING_PERIOD of 7 days", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.DEFAULT_WAITING_PERIOD()).to.equal(DEFAULT_WAITING_PERIOD);
        });

        it("exposes MIN_WAITING_PERIOD of 1 day", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.MIN_WAITING_PERIOD()).to.equal(1 * 24 * 60 * 60);
        });

        it("exposes MAX_WAITING_PERIOD of 90 days", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.MAX_WAITING_PERIOD()).to.equal(90 * 24 * 60 * 60);
        });

        it("supports IConditionResolver via ERC-165", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.supportsInterface("0x01ffc9a7")).to.be.true;
        });

        it("does not claim IUnderwriterPolicy support", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.supportsInterface("0x80bcb11e")).to.be.false;
        });
    });
});
