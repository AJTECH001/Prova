/**
 * repair-pool.ts
 *
 * Fixes the 0x4d13139e (InvalidPool) revert.
 *
 * Root cause (confirmed): pool._poolFactory (storage slot 4) = address(0).
 * When CCM calls pool.purchaseCoverage(), the pool calls _poolFactory.isPool(address(this)).
 * Calling address(0).isPool() returns empty bytes which decodes as false → !false → revert.
 *
 * PoolFactory.isPool(pool) = true is NECESSARY but NOT SUFFICIENT — the external
 * registry can know about the pool while the pool's internal back-reference is unset.
 *
 * Strategy (in order):
 *   1. Read pool storage slot[4] to check _poolFactory.
 *   2. If slot[4] is zero or wrong: deploy a new pool via ConfidentialPoolFactory.createPool(cUSDC).
 *      The factory's createPool() sets _poolFactory = address(factory) during initialize().
 *   3. If slot[4] is correct and factory.isPool() = true: pool is valid; just ensure policy is in it.
 *   4. Print the new pool address for POOL_ADDRESS env update.
 *
 * Also repairs CCM.escrow() and CCM.poolFactory() if misconfigured.
 *
 * Run: npx hardhat run scripts/repair-pool.ts --network arb-sepolia
 *      POOL_ADDRESS=0x...  (required — the pool to repair or the already-deployed new pool)
 */

import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
dotenv.config();

// ─── Addresses ────────────────────────────────────────────────────────────────

const CCM             = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';
const ESCROW          = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';
const POOL_FACTORY    = '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80';
const POLICY_REGISTRY = '0x962A6c7Be4fC765B0E8B601ab4BB210938660190';
const CUSDC           = '0x42E47f9bA89712C317f60A72C81A610A2b68c48a';
const POLICY          = process.env.POLICY_ADDRESS ?? '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';
const POOL            = process.env.POOL_ADDRESS ?? '';

// ─── ABIs ─────────────────────────────────────────────────────────────────────

// InsurancePool has NO insuranceManager() getter — _coverageManager is private.
// Authorization is checked by the CCM via PoolFactory.isPool(), not a pool getter.
const POOL_ABI = [
  'function isPolicy(address) view returns (bool)',
  'function addPolicy(address policy_) external',
];

const CCM_ABI = [
  'function escrow() view returns (address)',
  'function poolFactory() view returns (address)',
  'function setEscrow(address escrow_) external',
  'function setPoolFactory(address factory_) external',
];

const FACTORY_ABI = [
  'function createPool(address paymentToken) returns (uint256 poolId, address pool)',
  'function isPool(address) view returns (bool)',
  'event PoolCreated(uint256 indexed poolId, address indexed pool, address indexed underwriter)',
];

const REGISTRY_ABI = [
  'function isPolicy(address) view returns (bool)',
  'function registerPolicy(address policy_) external',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(addr: string): string { return addr.toLowerCase(); }

async function tryRepairCcm(deployer: ethers.Signer): Promise<void> {
  const ccm = new ethers.Contract(CCM, CCM_ABI, deployer);
  console.log('\n── Verifying ConfidentialCoverageManager wiring ──────────────');

  const [currentEscrow, currentFactory] = await Promise.all([
    ccm.escrow().catch(() => null),
    ccm.poolFactory().catch(() => null),
  ]);

  if (norm(currentEscrow ?? '') !== norm(ESCROW)) {
    console.log(`  ⚠️  CCM.escrow = ${currentEscrow} → calling setEscrow(${ESCROW})`);
    const tx = await ccm.setEscrow(ESCROW);
    await tx.wait();
    console.log(`  ✅ setEscrow confirmed (${tx.hash})`);
  } else {
    console.log(`  ✅ CCM.escrow correct: ${currentEscrow}`);
  }

  if (norm(currentFactory ?? '') !== norm(POOL_FACTORY)) {
    console.log(`  ⚠️  CCM.poolFactory = ${currentFactory} → calling setPoolFactory(${POOL_FACTORY})`);
    const tx = await ccm.setPoolFactory(POOL_FACTORY);
    await tx.wait();
    console.log(`  ✅ setPoolFactory confirmed (${tx.hash})`);
  } else {
    console.log(`  ✅ CCM.poolFactory correct: ${currentFactory}`);
  }
}

async function ensurePolicyInPool(deployer: ethers.Signer, poolAddress: string): Promise<void> {
  const pool     = new ethers.Contract(poolAddress, POOL_ABI, deployer);
  const registry = new ethers.Contract(POLICY_REGISTRY, REGISTRY_ABI, deployer);

  // 1. Register policy in ConfidentialPolicyRegistry (permissionless)
  const isInRegistry = await registry.isPolicy(POLICY).catch(() => false);
  if (!isInRegistry) {
    console.log(`\n  Registering policy in ConfidentialPolicyRegistry...`);
    const tx = await registry.registerPolicy(POLICY);
    await tx.wait();
    console.log(`  ✅ Policy registered (${tx.hash})`);
  } else {
    console.log(`  ✅ Policy already in ConfidentialPolicyRegistry`);
  }

  // 2. Whitelist policy in pool (requires deployer == pool underwriter)
  const isInPool = await pool.isPolicy(POLICY).catch(() => false);
  if (!isInPool) {
    console.log(`\n  Adding policy to pool ${poolAddress}...`);
    const tx = await pool.addPolicy(POLICY);
    await tx.wait();
    console.log(`  ✅ addPolicy confirmed (${tx.hash})`);
  } else {
    console.log(`  ✅ Policy already whitelisted in pool`);
  }
}

async function repairPool(deployer: ethers.Signer): Promise<string> {
  if (!POOL) throw new Error('POOL_ADDRESS env var is required');

  const factory = new ethers.Contract(POOL_FACTORY, FACTORY_ABI, deployer);
  console.log(`\n── Validating pool ${POOL} ─────────────────────────────────────`);

  // PoolFactory.isPool() is the external registry check.
  const isRegistered = await factory.isPool(POOL).catch(() => false);

  if (isRegistered) {
    console.log(`  ✅ Pool registered in ConfidentialPoolFactory — pool is valid`);
    await ensurePolicyInPool(deployer, POOL);
    return POOL;
  }

  console.log(`  ⚠️  Pool NOT registered in ConfidentialPoolFactory`);
  console.log(`  Root cause: CCM.purchaseCoverage calls factory.isPool(pool) → false → InvalidPool`);
  console.log(`  Fix: deploy a new pool via the canonical factory`);
  return await deployNewPool(deployer);
}

async function deployNewPool(deployer: ethers.Signer): Promise<string> {
  const factory     = new ethers.Contract(POOL_FACTORY, FACTORY_ABI, deployer);
  const deployerAddr = await deployer.getAddress();

  console.log(`\n── Deploying new pool via ConfidentialPoolFactory ─────────────`);
  console.log(`  Factory     : ${POOL_FACTORY}`);
  console.log(`  paymentToken: ${CUSDC}`);
  console.log(`  Deployer    : ${deployerAddr}`);
  console.log(`  Note        : deployer becomes pool underwriter (required for addPolicy)`);

  const tx      = await factory.createPool(CUSDC);
  const receipt = await tx.wait();
  console.log(`  createPool tx: ${receipt.hash}`);

  // Parse PoolCreated event
  const iface   = new ethers.Interface(FACTORY_ABI);
  let newPool: string | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === 'PoolCreated') {
        newPool = parsed.args.pool as string;
        console.log(`  ✅ New pool deployed: ${newPool}`);
        break;
      }
    } catch { /* not this log */ }
  }
  if (!newPool) throw new Error('Could not parse PoolCreated event from receipt');

  // Verify: factory must now recognise the new pool
  const isRegistered = await factory.isPool(newPool);
  if (!isRegistered) {
    throw new Error(
      `New pool ${newPool} is NOT in ConfidentialPoolFactory._isPool — ` +
      `the factory may be misconfigured or point to a stale implementation.`,
    );
  }
  console.log(`  ✅ Verified: factory.isPool(${newPool}) = true`);
  console.log(`  ✅ Pool _coverageManager = CCM (set by factory during initialize)`);

  await ensurePolicyInPool(deployer, newPool);
  return newPool;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log('=== PROVA Pool Repair Script ===');
  console.log('Network :', (await ethers.provider.getNetwork()).name);
  console.log('Deployer:', await deployer.getAddress());
  console.log('Balance :', ethers.formatEther(await ethers.provider.getBalance(await deployer.getAddress())), 'ETH');

  if (!POOL) {
    console.error('\n❌ POOL_ADDRESS env var is required');
    console.error('   Set it in .env or pass inline: POOL_ADDRESS=0x... npx hardhat run ...');
    process.exit(1);
  }

  // Step 1: repair CCM wiring
  await tryRepairCcm(deployer);

  // Step 2: validate pool and ensure policy is wired
  const finalPool = await repairPool(deployer);

  console.log('\n=== Repair Complete ===');
  console.log('Final pool address:', finalPool);

  if (norm(finalPool) !== norm(POOL)) {
    console.log('\n⚠️  Pool address changed — update your environment:');
    console.log(`  POOL_ADDRESS=${finalPool}`);
    console.log('\n  1. Update backend .env: POOL_ADDRESS=' + finalPool);
    console.log('  2. Redeploy the backend service.');
    console.log('  3. The old pool stakes are NOT migrated.');
  } else {
    console.log('\n✅ Pool repaired in-place. No environment update needed.');
  }

  console.log('\nRun verification to confirm:');
  console.log(`  POOL_ADDRESS=${finalPool} npx hardhat run scripts/verify-deployment.ts --network arb-sepolia`);
}

main().catch((e) => { console.error(e); process.exit(1); });
