import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

describe("PremiumPool", function () {
  it("should provide liquidity", async function () {
    const { pool, token, owner } = await loadFixture(deployProvaFixture);
    await token.mint(owner.address, 1000);
    await token.connect(owner).approve(await pool.getAddress(), 1000);

    await expect(pool.connect(owner).provideLiquidity(await token.getAddress(), 1000))
      .to.emit(pool, "LiquidityProvided");

    expect(await pool.poolBalances(await token.getAddress())).to.equal(1000);
    expect(await pool.lpShares(await token.getAddress(), owner.address)).to.equal(1000);
  });

  it("should fail to remove liquidity before lock-up period", async function () {
    const { pool, token, owner } = await loadFixture(deployProvaFixture);
    await token.mint(owner.address, 1000);
    await token.connect(owner).approve(await pool.getAddress(), 1000);
    await pool.connect(owner).provideLiquidity(await token.getAddress(), 1000);

    await expect(pool.connect(owner).removeLiquidity(await token.getAddress(), 500))
      .to.be.revertedWith("Liquidity locked for cooldown");
  });

  it("should remove liquidity after lock-up period", async function () {
    const { pool, token, owner } = await loadFixture(deployProvaFixture);
    await token.mint(owner.address, 1000);
    await token.connect(owner).approve(await pool.getAddress(), 1000);
    await pool.connect(owner).provideLiquidity(await token.getAddress(), 1000);

    // Advance time by 48 hours + 1 second
    await ethers.provider.send("evm_increaseTime", [172801]);
    await ethers.provider.send("evm_mine");

    await expect(pool.connect(owner).removeLiquidity(await token.getAddress(), 500))
      .to.emit(pool, "LiquidityRemoved");

    expect(await token.balanceOf(owner.address)).to.equal(500);
    expect(await pool.poolBalances(await token.getAddress())).to.equal(500);
  });

  it("should set lock period", async function () {
    const { pool, manager, owner } = await loadFixture(deployProvaFixture);
    
    // Need to transfer ownership back from manager to owner for this test
    if (await pool.owner() !== owner.address) {
        await manager.transferPoolOwnership(owner.address);
    }

    await expect(pool.setLockPeriod(3600))
      .to.emit(pool, "TreasuryUpdated"); // Reusing event for demo
    expect(await pool.lockPeriod()).to.equal(3600);
  });

  it("should deposit premium with treasury fee split", async function () {
    const { pool, token, seller, owner } = await loadFixture(deployProvaFixture);
    await token.mint(seller.address, 1000);
    await token.connect(seller).approve(await pool.getAddress(), 1000);

    // Default treasury fee is 5% (500 bps)
    await expect(pool.connect(seller).depositPremium(await token.getAddress(), 1000))
      .to.emit(pool, "PremiumDeposited");

    // 5% of 1000 = 50 (to treasury)
    // 95% of 1000 = 950 (to pool balance)
    expect(await pool.poolBalances(await token.getAddress())).to.equal(950);
    expect(await token.balanceOf(owner.address)).to.equal(50); // owner is treasury by default
  });

  it("should view earnings correctly", async function () {
    const { pool, token, owner, seller } = await loadFixture(deployProvaFixture);
    // Setup: LP provides 1000
    await token.mint(owner.address, 1000);
    await token.connect(owner).approve(await pool.getAddress(), 1000);
    await pool.connect(owner).provideLiquidity(await token.getAddress(), 1000);

    // Setup: Premium of 1000 deposited (950 to pool)
    await token.mint(seller.address, 1000);
    await token.connect(seller).approve(await pool.getAddress(), 1000);
    await pool.connect(seller).depositPremium(await token.getAddress(), 1000);

    // Total balance = 1000 (initial) + 950 (premium) = 1950
    // LP owns 100% of shares
    const [value, shares] = await pool.viewEarnings(await token.getAddress(), owner.address);
    expect(value).to.equal(1950);
    expect(shares).to.equal(1000);
  });

  it("should withdraw payout (owner only)", async function () {
    const { pool, token, owner, seller, buyer, manager } = await loadFixture(deployProvaFixture);
    // Need to transfer ownership back from manager to owner for this test
    await manager.transferPoolOwnership(owner.address);

    await token.mint(seller.address, 1000);
    await token.connect(seller).approve(await pool.getAddress(), 1000);
    await pool.connect(seller).depositPremium(await token.getAddress(), 1000);

    await expect(pool.connect(owner).withdrawPayout(await token.getAddress(), 500, buyer.address))
      .to.emit(pool, "PayoutWithdrawn");

    expect(await token.balanceOf(buyer.address)).to.equal(500);
    expect(await pool.poolBalances(await token.getAddress())).to.equal(450); // 950 - 500
  });

  it("should set treasury", async function () {
    const { pool, buyer, owner, manager } = await loadFixture(deployProvaFixture);
    // Need to transfer ownership back from manager to owner for this test
    if (await pool.owner() !== owner.address) {
        await manager.transferPoolOwnership(owner.address);
    }

    await expect(pool.setTreasury(buyer.address, 1000))
      .to.emit(pool, "TreasuryUpdated");
    expect(await pool.treasury()).to.equal(buyer.address);
    expect(await pool.treasuryFeeBps()).to.equal(1000);
  });
});
