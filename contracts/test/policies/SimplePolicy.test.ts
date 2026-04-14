import { expect } from "chai";
import { ethers } from "hardhat";

// MockUnderwriterPolicy returns FHE-encrypted types (euint64, ebool).
// Tests verify correct behaviour without inspecting encrypted return values.
describe("MockUnderwriterPolicy", function () {

    async function deployMock(fixedRiskBps: number) {
        const Factory = await ethers.getContractFactory("MockUnderwriterPolicy");
        const mock = await Factory.deploy(fixedRiskBps) as any;
        await mock.waitForDeployment();
        return mock;
    }

    it("stores the fixed risk score set at construction", async function () {
        const mock = await deployMock(500);
        expect(await mock.fixedRiskScoreBps()).to.equal(500);
    });

    it("evaluateRisk does not revert for any input", async function () {
        const mock = await deployMock(1000);
        const proof = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [42]);
        await expect(mock.evaluateRisk(0, proof)).to.not.be.reverted;
    });

    it("evaluateRisk does not revert with empty proof", async function () {
        const mock = await deployMock(500);
        await expect(mock.evaluateRisk(0, "0x")).to.not.be.reverted;
    });

    it("judge does not revert for any input", async function () {
        const mock = await deployMock(500);
        await expect(mock.judge(0, "0x")).to.not.be.reverted;
        await expect(mock.judge(99, ethers.randomBytes(64))).to.not.be.reverted;
    });

    it("onPolicySet is a no-op and does not revert", async function () {
        const mock = await deployMock(500);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [500]);
        await expect(mock.onPolicySet(0, data)).to.not.be.reverted;
    });

    it("supports IUnderwriterPolicy via ERC-165", async function () {
        const mock = await deployMock(500);
        expect(await mock.supportsInterface("0x01ffc9a7")).to.be.true;  // ERC-165
        expect(await mock.supportsInterface("0x80bcb11e")).to.be.true;  // IUnderwriterPolicy
    });
});
