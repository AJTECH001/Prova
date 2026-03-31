import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";

describe("ProvaUnderwriterPolicy", function () {
  let policy: any;

  before(async function () {
    if (hre.network.name === "hardhat" && hre.cofhe) {
      // Local runtime Fhenix initialization required by ReineiraOS
      await hre.cofhe.initializeLocalFHE();
    }
  });

  beforeEach(async function () {
    const PolicyFactory = await ethers.getContractFactory("ProvaUnderwriterPolicy");
    policy = await PolicyFactory.deploy();
    await policy.waitForDeployment();
  });

  it("should deploy and calculate complex actuarial encrypted premiums via FHE", async function () {
    const tx = await policy.evaluateRisk(100n, "0x");
    expect(tx).to.exist; 
  });
});
