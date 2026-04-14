import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployProvaFixture, encodeConditionData } from "../fixtures";

const WAITING_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds
const INVOICE_AMOUNT = 200_000n * 10n ** 6n; // $200k USDC

describe("ProvaPaymentResolver", function () {

    // ─── onConditionSet ───────────────────────────────────────────────────────

    describe("onConditionSet", function () {

        it("stores invoice condition and emits ConditionSet", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400; // tomorrow
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            await expect(resolver.onConditionSet(1, data))
                .to.emit(resolver, "ConditionSet")
                .withArgs(1, buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            const condition = await resolver.conditions(1);
            expect(condition.buyer).to.equal(buyer.address);
            expect(condition.seller).to.equal(seller.address);
            expect(condition.invoiceAmount).to.equal(INVOICE_AMOUNT);
            expect(condition.dueDate).to.equal(dueDate);
            expect(condition.invoicePaid).to.be.false;
            expect(condition.set).to.be.true;
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

        it("accepts separate escrowIds independently", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);

            await resolver.onConditionSet(1, data);
            await resolver.onConditionSet(2, data); // different ID — should not revert

            expect((await resolver.conditions(1)).set).to.be.true;
            expect((await resolver.conditions(2)).set).to.be.true;
        });
    });

    // ─── isConditionMet ───────────────────────────────────────────────────────

    describe("isConditionMet", function () {

        it("returns false before due date", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400; // 1 day ahead
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            expect(await resolver.isConditionMet(1)).to.be.false;
        });

        it("returns false after due date but before waiting period ends", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            // Advance to just after due date — waiting period (7 days) not over yet
            await time.increase(86400 + 1);

            expect(await resolver.isConditionMet(1)).to.be.false;
        });

        it("returns true after dueDate + 7-day waiting period", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            // Advance past due date + full 7-day waiting period
            await time.increase(86400 + WAITING_PERIOD + 1);

            expect(await resolver.isConditionMet(1)).to.be.true;
        });

        it("returns false for an unregistered escrowId", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.isConditionMet(999)).to.be.false;
        });

        it("returns false even after waiting period if invoice was marked paid", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);

            // Buyer records payment before the claim window opens
            await resolver.connect(buyer).recordPayment(1);

            // Advance past full waiting period
            await time.increase(86400 + WAITING_PERIOD + 1);

            // Claim should still be blocked
            expect(await resolver.isConditionMet(1)).to.be.false;
        });
    });

    // ─── recordPayment ────────────────────────────────────────────────────────

    describe("recordPayment", function () {

        async function setupEscrow(resolver: any, buyer: any, seller: any) {
            const dueDate = (await time.latest()) + 86400;
            const data = encodeConditionData(buyer.address, seller.address, INVOICE_AMOUNT, dueDate);
            await resolver.onConditionSet(1, data);
        }

        it("allows buyer to record payment and emits PaymentRecorded", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            await setupEscrow(resolver, buyer, seller);

            await expect(resolver.connect(buyer).recordPayment(1))
                .to.emit(resolver, "PaymentRecorded")
                .withArgs(1, buyer.address);

            expect((await resolver.conditions(1)).invoicePaid).to.be.true;
        });

        it("allows seller to record payment", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            await setupEscrow(resolver, buyer, seller);

            await expect(resolver.connect(seller).recordPayment(1))
                .to.emit(resolver, "PaymentRecorded")
                .withArgs(1, seller.address);
        });

        it("reverts NotBuyerOrSeller for any other address", async function () {
            const { resolver, buyer, seller, stranger } = await loadFixture(deployProvaFixture);
            await setupEscrow(resolver, buyer, seller);

            await expect(resolver.connect(stranger).recordPayment(1))
                .to.be.revertedWithCustomError(resolver, "NotBuyerOrSeller");
        });

        it("reverts InvoiceAlreadyPaid on double-attestation", async function () {
            const { resolver, buyer, seller } = await loadFixture(deployProvaFixture);
            await setupEscrow(resolver, buyer, seller);

            await resolver.connect(buyer).recordPayment(1);
            await expect(resolver.connect(seller).recordPayment(1))
                .to.be.revertedWithCustomError(resolver, "InvoiceAlreadyPaid")
                .withArgs(1);
        });

        it("reverts ConditionNotSet for unregistered escrowId", async function () {
            const { resolver, buyer } = await loadFixture(deployProvaFixture);

            await expect(resolver.connect(buyer).recordPayment(999))
                .to.be.revertedWithCustomError(resolver, "ConditionNotSet")
                .withArgs(999);
        });
    });

    // ─── Constants & ERC-165 ─────────────────────────────────────────────────

    describe("constants and interface", function () {

        it("exposes WAITING_PERIOD of 7 days", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.WAITING_PERIOD()).to.equal(WAITING_PERIOD);
        });

        it("supports IConditionResolver via ERC-165", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            // IConditionResolver interfaceId
            expect(await resolver.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
        });

        it("does not claim IUnderwriterPolicy support", async function () {
            const { resolver } = await loadFixture(deployProvaFixture);
            expect(await resolver.supportsInterface("0x80bcb11e")).to.be.false;
        });
    });
});
