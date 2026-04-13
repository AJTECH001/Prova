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
    const dummyData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [ethers.Wallet.createRandom().address, 5000n, Math.floor(Date.now() / 1000) + 86400]
    );

    const tx = await resolver.onConditionSet(escrowId, dummyData);
    expect(tx).to.exist;
  });

  it("should return condition met after due date", async function () {
    const escrowId = 1n;
    const buyer = ethers.Wallet.createRandom().address;
    const latestBlock = (await ethers.provider.getBlock('latest'))!;
    const dueDate = latestBlock.timestamp + 60; // 60 seconds from current block
    const dummyData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [buyer, 5000n, dueDate]
    );

    await resolver.onConditionSet(escrowId, dummyData);

    // Before due date
    let isMet = await resolver.isConditionMet(escrowId);
    expect(isMet).to.be.false;

    // Advance blockchain time past due date
    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);

    isMet = await resolver.isConditionMet(escrowId);
    expect(isMet).to.be.true;
  });
});
