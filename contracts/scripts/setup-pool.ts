/**
 * setup-pool.ts
 * 1. Register TradeCreditInsurancePolicy in Reineira PolicyRegistry
 * 2. Add it to the PROVA insurance pool
 * Run: npx hardhat run scripts/setup-pool.ts --network arb-sepolia
 */

import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const POLICY_REGISTRY  = "0x962A6c7Be4fC765B0E8B601ab4BB210938660190";
const POOL_ADDRESS     = process.env.POOL_ADDRESS ?? "0xfed51d4e0394276c1ede1a9e4ab7d09f56d54507";
const POLICY_ADDRESS   = process.env.POLICY_ADDRESS ?? "0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5";

const POLICY_REGISTRY_ABI = [
  "function registerPolicy(address policy_) external",
  "function isPolicy(address policy_) external view returns (bool)",
];

const POOL_ABI = [
  "function addPolicy(address policy_) external",
  "function policies(uint256) external view returns (address)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Wallet :", deployer.address);
  console.log("Policy :", POLICY_ADDRESS);
  console.log("Pool   :", POOL_ADDRESS);

  const registry = new ethers.Contract(POLICY_REGISTRY, POLICY_REGISTRY_ABI, deployer);
  const pool     = new ethers.Contract(POOL_ADDRESS,     POOL_ABI,            deployer);

  // ── 1. Check if already registered ──────────────────────────────────────────
  const alreadyRegistered = await registry.isPolicy(POLICY_ADDRESS);
  if (alreadyRegistered) {
    console.log("✅ Policy already registered in PolicyRegistry — skipping");
  } else {
    console.log("⏳ Registering policy in PolicyRegistry...");
    const tx = await registry.registerPolicy(POLICY_ADDRESS);
    console.log("   tx:", tx.hash);
    await tx.wait();
    console.log("✅ registerPolicy confirmed");
  }

  // ── 2. Add policy to pool ────────────────────────────────────────────────────
  console.log("⏳ Adding policy to pool...");
  try {
    const tx2 = await pool.addPolicy(POLICY_ADDRESS);
    console.log("   tx:", tx2.hash);
    await tx2.wait();
    console.log("✅ addPolicy confirmed — pool is ready");
  } catch (e: any) {
    // Policy may already be added — that's fine
    if (e?.message?.includes("AlreadyAdded") || e?.message?.includes("already")) {
      console.log("✅ Policy already added to pool — nothing to do");
    } else {
      throw e;
    }
  }

  console.log("\n=== Pool setup complete ===");
  console.log("Pool   :", POOL_ADDRESS);
  console.log("Policy :", POLICY_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
