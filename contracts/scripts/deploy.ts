import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PROVA contracts to", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy MockERC20 for testing
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Prova", "PROVA");
  await token.waitForDeployment();
  console.log("MockERC20 deployed to:", await token.getAddress());

  // Deploy PremiumPool
  const PremiumPool = await ethers.getContractFactory("PremiumPool");
  const pool = await PremiumPool.deploy();
  await pool.waitForDeployment();
  console.log("PremiumPool deployed to:", await pool.getAddress());

  // Deploy ConfidentialCoverageManager
  const ConfidentialCoverageManager = await ethers.getContractFactory("ConfidentialCoverageManager");
  const manager = await ConfidentialCoverageManager.deploy(await pool.getAddress());
  await manager.waitForDeployment();
  console.log("ConfidentialCoverageManager deployed to:", await manager.getAddress());

  // Transfer pool ownership to manager
  await pool.transferOwnership(await manager.getAddress());
  console.log("PremiumPool ownership transferred to manager");

  // Deploy ProvaPaymentResolver
  const ProvaPaymentResolver = await ethers.getContractFactory("ProvaPaymentResolver");
  const resolver = await ProvaPaymentResolver.deploy();
  await resolver.waitForDeployment();
  console.log("ProvaPaymentResolver deployed to:", await resolver.getAddress());

  // Deploy ProvaUnderwriterPolicy
  const ProvaUnderwriterPolicy = await ethers.getContractFactory("ProvaUnderwriterPolicy");
  const policy = await ProvaUnderwriterPolicy.deploy();
  await policy.waitForDeployment();
  console.log("ProvaUnderwriterPolicy deployed to:", await policy.getAddress());

  // Deploy ConfidentialEscrow
  const ConfidentialEscrow = await ethers.getContractFactory("ConfidentialEscrow");
  const escrow = await ConfidentialEscrow.deploy();
  await escrow.waitForDeployment();
  console.log("ConfidentialEscrow deployed to:", await escrow.getAddress());

  console.log("\nDeployment complete!");
  console.log("Token:", await token.getAddress());
  console.log("Pool:", await pool.getAddress());
  console.log("Manager:", await manager.getAddress());
  console.log("Resolver:", await resolver.getAddress());
  console.log("Policy:", await policy.getAddress());
  console.log("Escrow:", await escrow.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });