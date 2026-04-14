import { ethers, network } from "hardhat";

// Reineira platform addresses (Arbitrum Sepolia) — no manual config needed,
// baked into the SDK. Listed here for reference only.
const REINEIRA = {
  ConfidentialEscrow:          "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
  ConfidentialCoverageManager: "0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
  PoolFactory:                 "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
  PolicyRegistry:              "0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
  cUSDC:                       "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
  USDC:                        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

async function main() {
  console.log("Deploying PROVA plugin contracts to", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // ── 1. ProvaPaymentResolver ────────────────────────────────────────────────
  // Implements IConditionResolver — controls when the Reineira escrow releases.
  const ProvaPaymentResolver = await ethers.getContractFactory("ProvaPaymentResolver");
  const resolver = await ProvaPaymentResolver.deploy();
  await resolver.waitForDeployment();
  console.log("ProvaPaymentResolver deployed to:", await resolver.getAddress());

  // ── 2. ProvaUnderwriterPolicy ──────────────────────────────────────────────
  // Implements IUnderwriterPolicy — FHE risk scoring + dispute judgment.
  const ProvaUnderwriterPolicy = await ethers.getContractFactory("ProvaUnderwriterPolicy");
  const policy = await ProvaUnderwriterPolicy.deploy();
  await policy.waitForDeployment();
  console.log("ProvaUnderwriterPolicy deployed to:", await policy.getAddress());

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\nDeployment complete!");
  console.log("ProvaPaymentResolver :", await resolver.getAddress());
  console.log("ProvaUnderwriterPolicy:", await policy.getAddress());
  console.log("\nReineira platform contracts (pre-deployed, no action needed):");
  console.log("  ConfidentialEscrow         :", REINEIRA.ConfidentialEscrow);
  console.log("  ConfidentialCoverageManager:", REINEIRA.ConfidentialCoverageManager);
  console.log("  PoolFactory                :", REINEIRA.PoolFactory);
  console.log("  PolicyRegistry             :", REINEIRA.PolicyRegistry);
  console.log("\nNext steps:");
  console.log("  1. Create an insurance pool via PoolFactory");
  console.log("  2. Create an escrow via ConfidentialEscrow with resolver =", await resolver.getAddress());
  console.log("  3. Create coverage via ConfidentialCoverageManager with policy =", await policy.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
