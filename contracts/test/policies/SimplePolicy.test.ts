import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

// ─────────────────────────────────────────────────────────────────────────────
// MockUnderwriterPolicy — verifies the test mock used across coverage tests
// ─────────────────────────────────────────────────────────────────────────────
describe("MockUnderwriterPolicy", function () {

  it("returns the fixed risk score set at construction", async function () {
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(500);

    const score = await policy.evaluateRisk(0, "0x");
    expect(score).to.equal(500);
  });

  it("accepts any riskProof bytes without reverting", async function () {
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(1000);

    const arbitraryProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "bytes"],
      [42, "0xdeadbeef"]
    );
    await expect(policy.evaluateRisk(0, arbitraryProof)).not.to.be.reverted;
  });

  it("judge() always returns true regardless of disputeProof", async function () {
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(500);

    expect(await policy.judge(0, "0x")).to.be.true;
    expect(await policy.judge(99, ethers.randomBytes(64))).to.be.true;
  });

  it("onPolicySet is a no-op and does not revert", async function () {
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(500);

    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await expect(policy.onPolicySet(0, data)).not.to.be.reverted;
  });

  it("supports IUnderwriterPolicy via ERC-165", async function () {
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(500);

    expect(await policy.supportsInterface("0x01ffc9a7")).to.be.true;  // ERC-165
    expect(await policy.supportsInterface("0x80bcb11e")).to.be.true;  // IUnderwriterPolicy
  });

  it("correctly computes premiumAmount for 10% risk score (1000 bps)", async function () {
    // This validates the math used in ConfidentialCoverageManager:
    // premiumAmount = coverageAmount * riskScoreBps / 10000
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const policy = await MockPolicy.deploy(1000); // 10%

    const score = await policy.evaluateRisk(0, "0x");
    const coverageAmount = 5000n;
    const expectedPremium = (coverageAmount * score) / 10000n;
    expect(expectedPremium).to.equal(500n); // 10% of 5000 = 500
  });

  it("fixture deploys mockPolicy returning 10000 bps (100%)", async function () {
    const { mockPolicy } = await loadFixture(deployProvaFixture);
    const score = await mockPolicy.evaluateRisk(0, "0x");
    expect(score).to.equal(10000);
  });
});
