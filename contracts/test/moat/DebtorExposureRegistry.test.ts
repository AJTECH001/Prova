import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProvaFixture, DEFAULT_DEBTOR_ID, DEFAULT_POOL_ID } from "../fixtures";

describe("DebtorExposureRegistry", function () {

    // ─── registerContract / deregisterContract ────────────────────────────────

    describe("registerContract", function () {

        it("owner can register a contract", async function () {
            const { exposureRegistry } = await loadFixture(deployProvaFixture);
            const addr = ethers.Wallet.createRandom().address;

            await expect(exposureRegistry.registerContract(addr))
                .to.emit(exposureRegistry, "ContractRegistered")
                .withArgs(addr);

            expect(await exposureRegistry.isRegistered(addr)).to.be.true;
        });

        it("owner can deregister a contract", async function () {
            const { exposureRegistry } = await loadFixture(deployProvaFixture);
            const addr = ethers.Wallet.createRandom().address;

            await exposureRegistry.registerContract(addr);
            await expect(exposureRegistry.deregisterContract(addr))
                .to.emit(exposureRegistry, "ContractDeregistered")
                .withArgs(addr);

            expect(await exposureRegistry.isRegistered(addr)).to.be.false;
        });

        it("non-owner cannot register a contract", async function () {
            const { exposureRegistry, stranger } = await loadFixture(deployProvaFixture);

            await expect(
                exposureRegistry.connect(stranger).registerContract(ethers.Wallet.createRandom().address),
            ).to.be.reverted;
        });
    });

    // ─── addExposure ──────────────────────────────────────────────────────────
    //
    // addExposure(bytes32 debtorId, address poolId, euint64 amount, uint64 globalCapPlain)
    // requires a CoFHE-sealed euint64 ciphertext — these calls revert on local Hardhat
    // without a CoFHE precompile. Tests verify access-control logic only.

    describe("addExposure", function () {

        it("unregistered contract cannot call addExposure", async function () {
            const { exposureRegistry, stranger } = await loadFixture(deployProvaFixture);

            // euint64 is bytes32 on-chain. The access check fires before any FHE operation.
            await expect(
                exposureRegistry.connect(stranger).addExposure(
                    DEFAULT_DEBTOR_ID,
                    DEFAULT_POOL_ID,
                    ethers.ZeroHash,
                    1_000_000n,
                ),
            ).to.be.revertedWithCustomError(exposureRegistry, "NotRegisteredContract");
        });

        it("registered contract calling addExposure with ZeroHash amount succeeds (uninitialized handle defaults to 0)", async function () {
            // FHE.add treats an uninitialized euint64 (ZeroHash) as euint64(0), so no revert.
            // In production, callers supply a real euint64 handle and must call
            // FHE.allow(amount, registry) before the cross-contract call so the ACL check passes.
            const { exposureRegistry } = await loadFixture(deployProvaFixture);
            const [, , , , fresh] = await ethers.getSigners();
            await exposureRegistry.registerContract(fresh.address);

            await expect(
                exposureRegistry.connect(fresh).addExposure(
                    DEFAULT_DEBTOR_ID,
                    DEFAULT_POOL_ID,
                    ethers.ZeroHash,
                    1_000_000n,
                ),
            ).to.not.be.reverted;
        });
    });

    // ─── isRegistered ─────────────────────────────────────────────────────────

    describe("isRegistered", function () {

        it("returns false for an address that was never registered", async function () {
            const { exposureRegistry } = await loadFixture(deployProvaFixture);
            const unknown = ethers.Wallet.createRandom().address;
            expect(await exposureRegistry.isRegistered(unknown)).to.be.false;
        });

        it("returns true for the policy address registered in fixture", async function () {
            const { exposureRegistry, policy } = await loadFixture(deployProvaFixture);
            expect(await exposureRegistry.isRegistered(await policy.getAddress())).to.be.true;
        });
    });
});
