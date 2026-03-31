import { expect } from "chai";
import { ethers } from "hardhat";

describe("ProvaPaymentResolver", function () {
  let resolver: any;

  beforeEach(async function () {
    const ResolverFactory = await ethers.getContractFactory("ProvaPaymentResolver");
    resolver = await ResolverFactory.deploy();
    await resolver.waitForDeployment();
  });

  it("should register escrow configs", async function () {
    const escrowId = 1n;
    const dummyBuyer = ethers.ZeroAddress; // Replace with valid buyer address for deeper tests
    const dummyData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [ethers.Wallet.createRandom().address, 5000n, Date.now() + 86400]
    );

    const tx = await resolver.onConditionSet(escrowId, dummyData);
    expect(tx).to.exist;
  });
});
