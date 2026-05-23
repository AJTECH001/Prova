/**
 * diagnose-invalid-pool.ts
 *
 * Pinpoints the exact cause of the InvalidPool (0x4d13139e) revert.
 *
 * Checks every link in the CCM → factory → pool chain and prints a
 * machine-readable verdict so the operator knows exactly which repair
 * to run without guessing.
 *
 * Run:
 *   POOL_ADDRESS=0x... npx hardhat run scripts/diagnose-invalid-pool.ts --network arb-sepolia
 */

import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
dotenv.config();

const POOL_ADDRESS    = process.env.POOL_ADDRESS ?? '';
const POLICY_ADDRESS  = process.env.POLICY_ADDRESS ?? '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';

// Reineira core — these are the addresses the PROVA codebase expects.
const EXPECTED_CCM     = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';
const EXPECTED_FACTORY = '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80';
const EXPECTED_ESCROW  = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';

const CCM_ABI = [
  'function poolFactory() view returns (address)',
  'function escrow() view returns (address)',
];
const FACTORY_ABI = [
  'function isPool(address) view returns (bool)',
];
const POOL_ABI = [
  'function isPolicy(address) view returns (bool)',
];

type Status = 'OK' | 'FAIL' | 'WARN' | 'SKIP';

interface Check {
  name: string;
  status: Status;
  value: string;
  action?: string;
}

async function safeRead(
  address: string,
  abi: string[],
  fn: string,
  args: unknown[] = [],
): Promise<unknown> {
  try {
    const c = new ethers.Contract(address, abi, ethers.provider);
    return await c[fn](...args);
  } catch (e: unknown) {
    return `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function norm(s: unknown): string { return String(s ?? '').toLowerCase(); }

async function main(): Promise<void> {
  const network = await ethers.provider.getNetwork();
  const block   = await ethers.provider.getBlockNumber();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         PROVA — InvalidPool (0x4d13139e) Diagnostic              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`  Network : ${network.name} (chainId ${network.chainId})`);
  console.log(`  Block   : ${block}`);
  console.log(`  CCM     : ${EXPECTED_CCM}`);
  console.log(`  Pool    : ${POOL_ADDRESS || '(not set — set POOL_ADDRESS env var)'}`);
  console.log(`  Policy  : ${POLICY_ADDRESS}`);
  console.log();

  const checks: Check[] = [];

  // ── 1. CCM.poolFactory() ───────────────────────────────────────────────────
  const ccmFactory = await safeRead(EXPECTED_CCM, CCM_ABI, 'poolFactory');
  const ccmFactoryOk = norm(ccmFactory) === norm(EXPECTED_FACTORY);
  checks.push({
    name: 'CCM.poolFactory()',
    status: ccmFactoryOk ? 'OK' : 'FAIL',
    value: String(ccmFactory),
    action: ccmFactoryOk
      ? undefined
      : `Call CCM.setPoolFactory(${EXPECTED_FACTORY}) from CCM owner. ` +
        `If setPoolFactory doesn't exist, the CCM must be redeployed by Reineira.`,
  });

  // ── 2. CCM.escrow() ───────────────────────────────────────────────────────
  const ccmEscrow = await safeRead(EXPECTED_CCM, CCM_ABI, 'escrow');
  const ccmEscrowOk = norm(ccmEscrow) === norm(EXPECTED_ESCROW);
  checks.push({
    name: 'CCM.escrow()',
    status: ccmEscrowOk ? 'OK' : 'FAIL',
    value: String(ccmEscrow),
    action: ccmEscrowOk
      ? undefined
      : `Call CCM.setEscrow(${EXPECTED_ESCROW}) from CCM owner.`,
  });

  // ── 3. Expected factory isPool(pool) ──────────────────────────────────────
  if (POOL_ADDRESS) {
    const expectedFactoryIsPool = await safeRead(EXPECTED_FACTORY, FACTORY_ABI, 'isPool', [POOL_ADDRESS]);
    const expectedFactoryIsPoolOk = expectedFactoryIsPool === true;
    checks.push({
      name: `ExpectedFactory(${EXPECTED_FACTORY}).isPool(pool)`,
      status: expectedFactoryIsPoolOk ? 'OK' : 'FAIL',
      value: String(expectedFactoryIsPool),
      action: expectedFactoryIsPoolOk
        ? undefined
        : `Pool was NOT created by the canonical factory. ` +
          `Run: npx hardhat run scripts/repair-pool.ts --network arb-sepolia`,
    });
  }

  // ── 4. CCM's actual factory isPool(pool) ─────────────────────────────────
  if (POOL_ADDRESS && typeof ccmFactory === 'string' && ccmFactory.startsWith('0x')) {
    if (norm(ccmFactory) !== norm(EXPECTED_FACTORY)) {
      const ccmActualFactoryIsPool = await safeRead(ccmFactory, FACTORY_ABI, 'isPool', [POOL_ADDRESS]);
      checks.push({
        name: `CCM's actual factory(${ccmFactory}).isPool(pool)`,
        status: ccmActualFactoryIsPool === true ? 'WARN' : 'FAIL',
        value: String(ccmActualFactoryIsPool),
        action: ccmActualFactoryIsPool === true
          ? `Pool is in CCM's actual factory, but not the expected factory. ` +
            `Fix: update EXPECTED_FACTORY in PROVA code to match CCM's factory, ` +
            `OR fix CCM.poolFactory() to point to ${EXPECTED_FACTORY}.`
          : `Pool is NOT in any known factory. Run repair-pool.ts.`,
      });
    }
  }

  // ── 5. Pool isPolicy check ────────────────────────────────────────────────
  if (POOL_ADDRESS) {
    const policyInPool = await safeRead(POOL_ADDRESS, POOL_ABI, 'isPolicy', [POLICY_ADDRESS]);
    checks.push({
      name: `Pool.isPolicy(policy)`,
      status: policyInPool === true ? 'OK' : 'WARN',
      value: String(policyInPool),
      action: policyInPool === true
        ? undefined
        : `Call InsurancePool.addPolicy(${POLICY_ADDRESS}) from pool underwriter.`,
    });
  }

  // ── Print results ─────────────────────────────────────────────────────────
  console.log('Checks:');
  const icons: Record<Status, string> = { OK: '✅', FAIL: '❌', WARN: '⚠️ ', SKIP: '⏭️ ' };
  for (const c of checks) {
    console.log(`  ${icons[c.status]} ${c.name}`);
    console.log(`       Value : ${c.value}`);
    if (c.action) console.log(`       Action: ${c.action}`);
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const failures = checks.filter((c) => c.status === 'FAIL');
  console.log('\n─────────────────────────────────────────────────────────────────');
  if (failures.length === 0) {
    console.log('✅ All checks passed — InvalidPool cause not reproduced by static reads.');
    console.log('   The pool may be valid but CCM has a runtime-only guard. Run verify-deployment.ts.');
  } else {
    console.log(`❌ ${failures.length} failure(s) found:\n`);
    for (const f of failures) {
      console.log(`  ❌ ${f.name}`);
      if (f.action) console.log(`     → ${f.action}`);
    }
    console.log('\nFix path:');
    const needsRepair = failures.some((f) => f.name.includes('isPool'));
    const needsCcmFix = failures.some((f) => f.name.includes('CCM.'));
    if (needsCcmFix) {
      console.log('  1. Fix CCM wiring (requires CCM owner wallet):');
      console.log(`     Cast: cast send ${EXPECTED_CCM} "setPoolFactory(address)" ${EXPECTED_FACTORY} --private-key $OWNER_KEY --rpc-url $RPC`);
    }
    if (needsRepair) {
      console.log('  2. Repair or redeploy pool:');
      console.log(`     POOL_ADDRESS=${POOL_ADDRESS} npx hardhat run scripts/repair-pool.ts --network arb-sepolia`);
    }
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  if (failures.length > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
