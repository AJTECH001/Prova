import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

describe("ProvaPaymentResolver", function () {
  it("should set condition", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await expect(resolver.onConditionSet(0, data)).to.emit(resolver, "ConditionSet");
  });

  it("should check condition not met", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await resolver.onConditionSet(0, data);
    expect(await resolver.isConditionMet(0)).to.be.false;
  });

  it("should check condition met", async function () {
    const { resolver, buyer } = await loadFixture(deployProvaFixture);
    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await resolver.onConditionSet(0, data);
    // Advance time past due date
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    expect(await resolver.isConditionMet(0)).to.be.true;
  });

  it("should support ERC-165", async function () {
    const { resolver } = await loadFixture(deployProvaFixture);
    expect(await resolver.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
    expect(await resolver.supportsInterface("0x80bcb11e")).to.be.false; // Not IUnderwriterPolicy
  });
});
