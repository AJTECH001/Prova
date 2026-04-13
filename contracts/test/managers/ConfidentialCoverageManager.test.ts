import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

// Coverage amount used across tests.
// MockUnderwriterPolicy returns 10000 bps (100%) so premiumAmount == coverageAmount.
const COVERAGE_AMOUNT = 1000;

// riskProof is "0x" — MockUnderwriterPolicy ignores it and returns fixedRiskScoreBps.
const RISK_PROOF = "0x";

describe("ConfidentialCoverageManager", function () {

  it("should create coverage and emit CoverageCreated", async function () {
    const { manager, mockPolicy, token, seller } = await loadFixture(deployProvaFixture);

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700] // basePremiumBps, minCreditScore
    );

    await expect(
      manager.createCoverage(
        0,
        await mockPolicy.getAddress(),
        seller.address,
        await token.getAddress(),
        COVERAGE_AMOUNT,
        policyData
      )
    ).to.emit(manager, "CoverageCreated");
  });

  it("should pay premium derived from evaluateRisk() and split into pool + treasury", async function () {
    const { manager, mockPolicy, token, pool, seller, owner } = await loadFixture(deployProvaFixture);

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await manager.createCoverage(
      0,
      await mockPolicy.getAddress(),
      seller.address,
      await token.getAddress(),
      COVERAGE_AMOUNT,
      policyData
    );

    // MockPolicy returns 10000 bps → premiumAmount = 1000 * 10000 / 10000 = 1000
    await token.mint(seller.address, COVERAGE_AMOUNT);
    await token.connect(seller).approve(await manager.getAddress(), COVERAGE_AMOUNT);

    await expect(
      manager.connect(seller).payPremium(0, RISK_PROOF, await token.getAddress())
    ).to.emit(manager, "PremiumPaid");

    // Treasury gets 5% of 1000 = 50 (owner is default treasury)
    // Pool gets 95% of 1000 = 950
    expect(await pool.poolBalances(await token.getAddress())).to.equal(950);
    expect(await token.balanceOf(owner.address)).to.equal(50);
  });

  it("should not allow double premium payment on same coverage", async function () {
    const { manager, mockPolicy, token, seller } = await loadFixture(deployProvaFixture);

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await manager.createCoverage(
      0,
      await mockPolicy.getAddress(),
      seller.address,
      await token.getAddress(),
      COVERAGE_AMOUNT,
      policyData
    );

    await token.mint(seller.address, COVERAGE_AMOUNT * 2);
    await token.connect(seller).approve(await manager.getAddress(), COVERAGE_AMOUNT * 2);

    // First premium activates coverage
    await manager.connect(seller).payPremium(0, RISK_PROOF, await token.getAddress());

    // Second premium should revert — coverage already active
    await expect(
      manager.connect(seller).payPremium(0, RISK_PROOF, await token.getAddress())
    ).to.be.revertedWith("Coverage already active");
  });

  it("should file valid claim and pay out coverageAmount to beneficiary", async function () {
    const { manager, mockPolicy, token, pool, seller, owner } = await loadFixture(deployProvaFixture);

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await manager.createCoverage(
      0,
      await mockPolicy.getAddress(),
      seller.address,
      await token.getAddress(),
      COVERAGE_AMOUNT,
      policyData
    );

    // Pay premium — pool receives 950
    await token.mint(seller.address, COVERAGE_AMOUNT);
    await token.connect(seller).approve(await manager.getAddress(), COVERAGE_AMOUNT);
    await manager.connect(seller).payPremium(0, RISK_PROOF, await token.getAddress());

    // Top up pool with extra liquidity so it can cover the full claim payout (950 < 1000)
    await token.mint(owner.address, 500);
    await token.connect(owner).approve(await pool.getAddress(), 500);
    await pool.connect(owner).provideLiquidity(await token.getAddress(), 500);

    // File claim — only beneficiary (seller) can call; MockPolicy.judge() always returns true
    const claimData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]);
    await expect(manager.connect(seller).fileClaim(0, claimData)).to.emit(manager, "ClaimFiled");

    // Seller (beneficiary) receives coverageAmount
    expect(await token.balanceOf(seller.address)).to.equal(COVERAGE_AMOUNT);
  });

  it("should deactivate coverage after claim is filed", async function () {
    const { manager, mockPolicy, token, pool, seller, owner } = await loadFixture(deployProvaFixture);

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    await manager.createCoverage(
      0,
      await mockPolicy.getAddress(),
      seller.address,
      await token.getAddress(),
      COVERAGE_AMOUNT,
      policyData
    );

    await token.mint(seller.address, COVERAGE_AMOUNT);
    await token.connect(seller).approve(await manager.getAddress(), COVERAGE_AMOUNT);
    await manager.connect(seller).payPremium(0, RISK_PROOF, await token.getAddress());

    await token.mint(owner.address, 500);
    await token.connect(owner).approve(await pool.getAddress(), 500);
    await pool.connect(owner).provideLiquidity(await token.getAddress(), 500);

    const claimData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]);
    await manager.connect(seller).fileClaim(0, claimData);

    // Coverage is now inactive — second claim should revert regardless of caller
    await expect(manager.connect(seller).fileClaim(0, claimData)).to.be.revertedWith("Coverage not active");
  });

  it("should scale premium correctly for different risk scores", async function () {
    const { pool, token, seller, owner } = await loadFixture(deployProvaFixture);

    // Deploy a second mock returning 500 bps (5% premium)
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const lowRiskPolicy = await MockPolicy.deploy(500);

    const Pool2 = await ethers.getContractFactory("PremiumPool");
    const pool2 = await Pool2.deploy();

    const Manager2 = await ethers.getContractFactory("ConfidentialCoverageManager");
    const manager2 = await Manager2.deploy(await pool2.getAddress());
    await pool2.transferOwnership(await manager2.getAddress());

    const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [500, 700]
    );
    // coverageAmount = 10000, riskScoreBps = 500 → premiumAmount = 10000 * 500 / 10000 = 500
    await manager2.createCoverage(
      0,
      await lowRiskPolicy.getAddress(),
      seller.address,
      await token.getAddress(),
      10000,
      policyData
    );

    await token.mint(seller.address, 500);
    await token.connect(seller).approve(await manager2.getAddress(), 500);

    await expect(
      manager2.connect(seller).payPremium(0, "0x", await token.getAddress())
    ).to.emit(manager2, "PremiumPaid");

    // 500 premium → 5% treasury = 25 → pool gets 475
    expect(await pool2.poolBalances(await token.getAddress())).to.equal(475);
  });
});
