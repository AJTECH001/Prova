import { ethers } from "hardhat";

export async function deployProvaFixture() {
    const [owner, seller, buyer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Mock", "MCK");

    const Escrow = await ethers.getContractFactory("ConfidentialEscrow");
    const escrow = await Escrow.deploy();

    const Resolver = await ethers.getContractFactory("ProvaPaymentResolver");
    const resolver = await Resolver.deploy();

    const Policy = await ethers.getContractFactory("ProvaUnderwriterPolicy");
    const policy = await Policy.deploy();

    // MockUnderwriterPolicy returns 10000 bps (100%) — premiumAmount == coverageAmount.
    // Used in coverage manager tests to avoid FHE precompile calls.
    const MockPolicy = await ethers.getContractFactory("MockUnderwriterPolicy");
    const mockPolicy = await MockPolicy.deploy(10000);

    const Pool = await ethers.getContractFactory("PremiumPool");
    const pool = await Pool.deploy();

    const Manager = await ethers.getContractFactory("ConfidentialCoverageManager");
    const manager = await Manager.deploy(await pool.getAddress());

    // Transfer pool ownership to manager so it can withdraw pool funds on claims.
    await pool.transferOwnership(await manager.getAddress());

    return { owner, seller, buyer, token, escrow, resolver, policy, mockPolicy, pool, manager };
}
