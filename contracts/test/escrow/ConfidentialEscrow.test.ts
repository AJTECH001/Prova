import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { deployProvaFixture } from "../fixtures";

describe("ConfidentialEscrow", function () {
  it("should create escrow (No upfront funding needed for Trade Credit)", async function () {
    const { escrow, token, resolver, seller, buyer } = await loadFixture(deployProvaFixture);

    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, Math.floor(Date.now() / 1000) + 3600]
    );

    await expect(escrow.connect(seller).createEscrow(
      buyer.address,
      await token.getAddress(),
      1000,
      await resolver.getAddress(),
      data
    )).to.emit(escrow, "EscrowCreated");
    
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("should settle escrow when condition met (Buyer pays Seller)", async function () {
    const { escrow, token, resolver, seller, buyer } = await loadFixture(deployProvaFixture);

    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await escrow.connect(seller).createEscrow(
      buyer.address,
      await token.getAddress(),
      1000,
      await resolver.getAddress(),
      data
    );

    // Buyer settles debt
    await token.mint(buyer.address, 1000);
    await token.connect(buyer).approve(await escrow.getAddress(), 1000);
    await escrow.connect(buyer).settleDebt(0, 1000);

    expect(await token.balanceOf(await escrow.getAddress())).to.equal(1000);

    // Wait for due date
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine");

    await expect(escrow.connect(buyer).settleEscrow(0)).to.emit(escrow, "FundsReleased");
    expect(await token.balanceOf(seller.address)).to.equal(1000);
  });

  it("should cancel unfunded escrow — no refund, emits EscrowCancelled", async function () {
    const { escrow, token, resolver, seller, buyer } = await loadFixture(deployProvaFixture);

    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await escrow.connect(seller).createEscrow(
      buyer.address,
      await token.getAddress(),
      1000,
      await resolver.getAddress(),
      data
    );

    // Unfunded cancel: emits EscrowCancelled with refundAmount=0, refundTo=0x0
    await expect(escrow.connect(seller).cancelEscrow(0))
      .to.emit(escrow, "EscrowCancelled")
      .withArgs(0, 0, ethers.ZeroAddress);

    // Seller receives nothing — there was nothing to refund
    expect(await token.balanceOf(seller.address)).to.equal(0);
    // Buyer also receives nothing — they never deposited
    expect(await token.balanceOf(buyer.address)).to.equal(0);
  });

  it("should cancel funded escrow — refunds buyer, not seller", async function () {
    const { escrow, token, resolver, seller, buyer } = await loadFixture(deployProvaFixture);

    const dueDate = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [buyer.address, 1000, dueDate]
    );

    await escrow.connect(seller).createEscrow(
      buyer.address,
      await token.getAddress(),
      1000,
      await resolver.getAddress(),
      data
    );

    // Buyer deposits funds
    await token.mint(buyer.address, 1000);
    await token.connect(buyer).approve(await escrow.getAddress(), 1000);
    await escrow.connect(buyer).settleDebt(0, 1000);

    // Seller cancels after buyer funded — buyer gets their money back
    await expect(escrow.connect(seller).cancelEscrow(0))
      .to.emit(escrow, "EscrowCancelled")
      .withArgs(0, 1000, buyer.address);

    expect(await token.balanceOf(buyer.address)).to.equal(1000);  // full refund
    expect(await token.balanceOf(seller.address)).to.equal(0);    // seller gets nothing
  });
});
