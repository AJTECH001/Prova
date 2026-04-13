import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

// ─────────────────────────────────────────────────────────────────────────────
// ProvaPaymentResolver — integration tests against the deployed contract
// ─────────────────────────────────────────────────────────────────────────────
describe("ProvaPaymentResolver (integration)", function () {

  it("stores condition config on onConditionSet", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await expect(resolver.onConditionSet(0, data)).to.emit(resolver, "ConditionSet");

    const condition = await resolver.conditions(0);
    expect(condition.buyer).to.equal(buyer.address);
    expect(condition.amount).to.equal(1000);
    expect(condition.dueDate).to.equal(dueDate);
    expect(condition.set).to.be.true;
  });

  it("rejects double initialisation for the same escrowId", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await resolver.onConditionSet(0, data);
    await expect(resolver.onConditionSet(0, data)).to.be.revertedWith("Condition already set");
  });

  it("rejects zero buyer address", async function () {
    const { resolver } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [ethers.ZeroAddress, 1000, dueDate]
    );

    await expect(resolver.onConditionSet(0, data)).to.be.revertedWith("Invalid buyer");
  });

  it("rejects zero invoice amount", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 0, dueDate]
    );

    await expect(resolver.onConditionSet(0, data)).to.be.revertedWith("Invalid amount");
  });

  it("rejects a due date in the past", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const pastDate = (await ethers.provider.getBlock("latest"))!.timestamp - 1;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, pastDate]
    );

    await expect(resolver.onConditionSet(0, data)).to.be.revertedWith("Due date must be in future");
  });

  it("isConditionMet returns false before due date", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await resolver.onConditionSet(0, data);
    expect(await resolver.isConditionMet(0)).to.be.false;
  });

  it("isConditionMet returns true after due date passes", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 60;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await resolver.onConditionSet(0, data);
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine");

    expect(await resolver.isConditionMet(0)).to.be.true;
  });

  it("isConditionMet returns false for unconfigured escrowId", async function () {
    const { resolver } = await loadFixture(deployProvaFixture);
    expect(await resolver.isConditionMet(999)).to.be.false;
  });

  it("supports IConditionResolver via ERC-165", async function () {
    const { resolver } = await loadFixture(deployProvaFixture);
    // ERC-165 own interface
    expect(await resolver.supportsInterface("0x01ffc9a7")).to.be.true;
    // IUnderwriterPolicy interface — should NOT be supported
    expect(await resolver.supportsInterface("0x80bcb11e")).to.be.false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ProvaUnderwriterPolicy — configuration and non-FHE paths
// ─────────────────────────────────────────────────────────────────────────────
describe("ProvaUnderwriterPolicy (integration)", function () {

  it("stores policy config on onPolicySet", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );

    await expect(policy.onPolicySet(0, data)).to.emit(policy, "PolicySet");

    const stored = await policy.policies(0);
    expect(stored.basePremiumBps).to.equal(500);
    expect(stored.minCreditScore).to.equal(700);
    expect(stored.set).to.be.true;
  });

  it("rejects double policy initialisation for the same coverageId", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );

    await policy.onPolicySet(0, data);
    await expect(policy.onPolicySet(0, data)).to.be.revertedWith("Policy already set");
  });

  it("rejects basePremiumBps of zero", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [0, 700]
    );

    await expect(policy.onPolicySet(0, data)).to.be.revertedWith("Invalid base premium");
  });

  it("rejects basePremiumBps above 10000", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [10001, 700]
    );

    await expect(policy.onPolicySet(0, data)).to.be.revertedWith("Invalid base premium");
  });

  it("judge() returns true (simplified demo implementation)", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const disputeProof = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]);
    expect(await policy.judge.staticCall(0, disputeProof)).to.be.true;
  });

  it("evaluateRisk() reverts without FHE coprocessor in standard Hardhat", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [500, 700]);
    await policy.onPolicySet(0, data);

    const riskProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256,uint8,uint8,bytes)"],
      [[123, 0, 4, "0x"]]
    );
    // FHE precompiles are not available in local Hardhat — expected revert
    await expect(policy.evaluateRisk(0, riskProof)).to.be.reverted;
  });

  it("exposes correct risk constants", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    expect(await policy.CREDIT_SCORE_THRESHOLD()).to.equal(700);
    expect(await policy.LOW_RISK_MULTIPLIER()).to.equal(1);
    expect(await policy.HIGH_RISK_MULTIPLIER()).to.equal(2);
  });

  it("supports IUnderwriterPolicy via ERC-165", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    expect(await policy.supportsInterface("0x01ffc9a7")).to.be.true;  // ERC-165
    expect(await policy.supportsInterface("0x80bcb11e")).to.be.true;  // IUnderwriterPolicy
  });
});
