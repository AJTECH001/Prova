import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

describe("ProvaUnderwriterPolicy", function () {
  it("should set policy", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700] // basePremiumBps, minCreditScore
    );

    await expect(policy.onPolicySet(0, data)).to.emit(policy, "PolicySet");
  });

  it("should evaluate risk (with dummy FHE input)", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await policy.onPolicySet(0, policyData);

    // InEuint32 { uint256 ctHash; uint8 securityZone; uint8 utype; bytes signature; }
    const riskProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256,uint8,uint8,bytes)"],
      [[123, 0, 4, "0x"]]
    );

    // Note: Reverts in standard Hardhat as FHE precompiles are missing, or passes if using mocks.
    // Given the previous setup, we keep the identical test expectation
    await expect(policy.evaluateRisk(0, riskProof)).to.be.reverted;
  });

  it("should judge dispute", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    const disputeProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256"],
      [1] // dummy
    );

    await expect(policy.judge(0, disputeProof)).to.not.be.reverted;
  });

  it("should support ERC-165", async function () {
    const { policy } = await loadFixture(deployProvaFixture);
    expect(await policy.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
    expect(await policy.supportsInterface("0x80bcb11e")).to.be.true; // IUnderwriterPolicy
  });
});
