/**
 * setup-pool-v2.ts
 * Uses the permissionless OLD PolicyRegistry + OLD PoolFactory.
 *
 * OLD PolicyRegistry (permissionless): 0xf421363B642315BD3555dE2d9BD566b7f9213c8E
 * OLD PoolFactory (still callable):    0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
 *
 * Run: npx hardhat run scripts/setup-pool-v2.ts --network arb-sepolia
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const OLD_FACTORY    = "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD";
const OLD_REGISTRY   = "0xf421363B642315BD3555dE2d9BD566b7f9213c8E";
const CUSDC          = "0x42E47f9bA89712C317f60A72C81A610A2b68c48a";  // new cUSDC
const OLD_CUSDC      = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";  // old cUSDC
const POLICY_ADDRESS = process.env.POLICY_ADDRESS ?? "0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5";

const REGISTRY_ABI = [
  "function registerPolicy(address policy_) external",
  "function isPolicy(address policy_) view returns (bool)",
];

const FACTORY_ABI = [
  "function createPool(address paymentToken) returns (uint256 poolId, address pool)",
  "function poolCount() view returns (uint256)",
  "event PoolCreated(uint256 indexed poolId, address indexed pool, address indexed underwriter)",
];

const POOL_ABI = [
  "function addPolicy(address policy) external",
  "function isPolicy(address policy) view returns (bool)",
  "function underwriter() view returns (address)",
  "function paymentToken() view returns (address)",
  "function stake(tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encryptedAmount) returns (uint256 stakeId)",
  "function stake(uint256 amount) returns (uint256 stakeId)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Wallet :", deployer.address);
  console.log("Policy :", POLICY_ADDRESS);

  const registry = new ethers.Contract(OLD_REGISTRY, REGISTRY_ABI, deployer);
  const factory  = new ethers.Contract(OLD_FACTORY,  FACTORY_ABI,  deployer);

  // ── 1. Register policy in permissionless OLD registry ───────────────────────
  const alreadyReg = await registry.isPolicy(POLICY_ADDRESS);
  if (alreadyReg) {
    console.log("✅ Policy already registered in OLD registry");
  } else {
    console.log("⏳ Registering in OLD PolicyRegistry...");
    const tx = await registry.registerPolicy(POLICY_ADDRESS);
    console.log("   tx:", tx.hash);
    await tx.wait();
    console.log("✅ registerPolicy confirmed");
  }

  // ── 2. Create pool via OLD factory ──────────────────────────────────────────
  console.log("\n⏳ Creating pool via OLD factory...");
  // Try with new cUSDC first; if it fails, fall back to old cUSDC
  let poolAddress: string | null = null;
  let poolId: bigint = 0n;

  for (const token of [CUSDC, OLD_CUSDC]) {
    try {
      const tx2 = await factory.createPool(token);
      console.log("   tx:", tx2.hash);
      const receipt = await tx2.wait();
      // Parse PoolCreated event
      const iface = new ethers.Interface(FACTORY_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          if (parsed?.name === "PoolCreated") {
            poolId      = parsed.args.poolId;
            poolAddress = parsed.args.pool;
            console.log(`✅ Pool created with paymentToken=${token}`);
            console.log(`   poolId=${poolId}  address=${poolAddress}`);
            break;
          }
        } catch {}
      }
      if (poolAddress) break;
    } catch (e: any) {
      console.log(`   createPool(${token.slice(0,10)}...) failed:`, e.message?.slice(0, 80));
    }
  }

  if (!poolAddress) throw new Error("Could not create pool");

  // ── 3. Add policy to pool ────────────────────────────────────────────────────
  const pool = new ethers.Contract(poolAddress, POOL_ABI, deployer);

  const underwriter = await pool.underwriter().catch(() => "n/a");
  const payToken    = await pool.paymentToken().catch(() => "n/a");
  console.log("\nPool underwriter:", underwriter);
  console.log("Pool paymentToken:", payToken);

  console.log("\n⏳ Adding policy to pool...");
  try {
    const tx3 = await pool.addPolicy(POLICY_ADDRESS);
    console.log("   tx:", tx3.hash);
    await tx3.wait();
    console.log("✅ addPolicy confirmed");
  } catch (e: any) {
    const data = (e as any).data ?? "";
    console.log("❌ addPolicy failed:", e.message?.slice(0, 200));
    if (data) console.log("   revert data:", data);
    throw e;
  }

  console.log("\n=== Pool Setup Complete ===");
  console.log("OLD Registry:", OLD_REGISTRY);
  console.log("Pool ID     :", poolId.toString());
  console.log("Pool Address:", poolAddress);
  console.log("Policy      :", POLICY_ADDRESS);
  console.log("\nAdd to backend .env:");
  console.log(`POOL_ADDRESS=${poolAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
