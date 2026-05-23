/**
 * verify-deployment.ts
 *
 * Full post-deployment health check for PROVA + Reineira contract configuration.
 * Exits with code 1 if any CRITICAL assertion fails — suitable for CI gates.
 *
 * Run: npx hardhat run scripts/verify-deployment.ts --network arb-sepolia
 */

import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
dotenv.config();

// ─── Addresses ────────────────────────────────────────────────────────────────

const ADDRESSES = {
  // PROVA contracts
  TradeCreditInsurancePolicy: process.env.POLICY_ADDRESS   ?? '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5',
  DebtorExposureRegistry:     process.env.EXPOSURE_REGISTRY_ADDRESS ?? '0xe3b6a9E4BDF597899e79D13C4f73B16dff610fBE',
  InsuranceClaimsRegistry:    process.env.CLAIMS_REGISTRY_ADDRESS   ?? '0x69e4fce78B3E1A4582FF2e35C51EA4364CB5D5dA',
  MockDebtorProof:            '0x817A8DA1e6B5A7E45Dcf3784870d82C3E67F1576',
  OracleDebtorProof:          process.env.ORACLE_DEBTOR_PROOF_ADDRESS ?? '',
  // Pool under test — must be provided
  InsurancePool:              process.env.POOL_ADDRESS ?? '',
  // Reineira core
  ConfidentialCoverageManager: '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67',
  ConfidentialEscrow:          '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6',
  ConfidentialPoolFactory:     '0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80',
  ConfidentialPolicyRegistry:  '0x962A6c7Be4fC765B0E8B601ab4BB210938660190',
  cUSDC:                       '0x42E47f9bA89712C317f60A72C81A610A2b68c48a',
};

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

// InsurancePool has NO insuranceManager() getter — _coverageManager is private.
// Validate via PoolFactory.isPool(): if registered, _coverageManager = CCM (set by factory at init).
const POOL_ABI    = ['function isPolicy(address) view returns (bool)'];
const FACTORY_ABI = ['function isPool(address) view returns (bool)'];
const CCM_ABI     = ['function escrow() view returns (address)', 'function poolFactory() view returns (address)'];
const POLICY_ABI  = ['function protocolCaller() view returns (address)', 'function isAllowedContract(address) view returns (bool)', 'function owner() view returns (address)', 'function debtorProofAdapter() view returns (address)'];
const REG_ABI     = ['function isPolicy(address) view returns (bool)'];
const EXP_ABI     = ['function isRegistered(address) view returns (bool)'];
const CLAIMS_ABI  = ['function isAllowedContract(address) view returns (bool)'];
const ORACLE_ABI  = ['function oracle() view returns (address)', 'function owner() view returns (address)'];

// ─── Result tracking ──────────────────────────────────────────────────────────

type Severity = 'CRITICAL' | 'WARN' | 'INFO';

interface CheckResult {
  name: string;
  severity: Severity;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, severity: Severity, passed: boolean, message: string): void {
  results.push({ name, severity, passed, message });
  const icon = passed ? '✅' : severity === 'CRITICAL' ? '❌' : '⚠️ ';
  console.log(`  ${icon} [${severity}] ${name}: ${message}`);
}

async function readContract(address: string, abi: string[], fn: string, args: unknown[] = []): Promise<unknown> {
  const contract = new ethers.Contract(address, abi, ethers.provider);
  return contract[fn](...args);
}

// ─── Checks ───────────────────────────────────────────────────────────────────

async function checkConfidentialCoverageManager(): Promise<void> {
  console.log('\n── ConfidentialCoverageManager ──────────────────────────────');

  const escrow   = await readContract(ADDRESSES.ConfidentialCoverageManager, CCM_ABI, 'escrow').catch(() => 'read-error');
  const factory  = await readContract(ADDRESSES.ConfidentialCoverageManager, CCM_ABI, 'poolFactory').catch(() => 'read-error');

  check('CCM.escrow()',      'CRITICAL', (escrow as string).toLowerCase() === ADDRESSES.ConfidentialEscrow.toLowerCase(),    `${escrow} (expected ${ADDRESSES.ConfidentialEscrow})`);
  check('CCM.poolFactory()', 'CRITICAL', (factory as string).toLowerCase() === ADDRESSES.ConfidentialPoolFactory.toLowerCase(), `${factory} (expected ${ADDRESSES.ConfidentialPoolFactory})`);
}

async function checkPool(): Promise<void> {
  if (!ADDRESSES.InsurancePool) {
    check('InsurancePool address', 'CRITICAL', false, 'POOL_ADDRESS env var not set');
    return;
  }

  console.log(`\n── InsurancePool (${ADDRESSES.InsurancePool}) ────────────────`);

  // InsurancePool has no insuranceManager() getter — _coverageManager is private.
  // Canonical check: PoolFactory.isPool() → true means factory deployed it with CCM wired.
  const isRegistered = await readContract(ADDRESSES.ConfidentialPoolFactory, FACTORY_ABI, 'isPool', [ADDRESSES.InsurancePool]).catch(() => false);
  const hasPolicy    = await readContract(ADDRESSES.InsurancePool, POOL_ABI, 'isPolicy', [ADDRESSES.TradeCreditInsurancePolicy]).catch(() => false);

  check(
    'factory.isPool(InsurancePool)',
    'CRITICAL',
    !!isRegistered,
    isRegistered ? 'true (CCM correctly wired via factory init)' : 'false — pool not created by canonical factory, CCM.purchaseCoverage will revert InvalidPool',
  );
  check('pool.isPolicy(TradeCreditInsurancePolicy)', 'WARN', !!hasPolicy, String(hasPolicy));
}

async function checkTradeCreditInsurancePolicy(): Promise<void> {
  console.log('\n── TradeCreditInsurancePolicy ───────────────────────────────');

  const protocolCaller   = await readContract(ADDRESSES.TradeCreditInsurancePolicy, POLICY_ABI, 'protocolCaller').catch(() => 'read-error');
  const debtorAdapter    = await readContract(ADDRESSES.TradeCreditInsurancePolicy, POLICY_ABI, 'debtorProofAdapter').catch(() => 'read-error');
  const allowedByExp     = await readContract(ADDRESSES.DebtorExposureRegistry, EXP_ABI, 'isRegistered', [ADDRESSES.TradeCreditInsurancePolicy]).catch(() => false);
  const allowedByClaims  = await readContract(ADDRESSES.InsuranceClaimsRegistry, CLAIMS_ABI, 'isAllowedContract', [ADDRESSES.TradeCreditInsurancePolicy]).catch(() => false);
  const inRegistry       = await readContract(ADDRESSES.ConfidentialPolicyRegistry, REG_ABI, 'isPolicy', [ADDRESSES.TradeCreditInsurancePolicy]).catch(() => false);

  check(
    'policy.protocolCaller()',
    'CRITICAL',
    (protocolCaller as string).toLowerCase() === ADDRESSES.ConfidentialCoverageManager.toLowerCase(),
    `${protocolCaller} (expected ${ADDRESSES.ConfidentialCoverageManager}) — run PolicyAdminService.ensureProtocolCallerCorrect() or call setProtocolCaller()`,
  );

  // CRITICAL: MockDebtorProof must NOT be wired on any live network.
  const isMock = (debtorAdapter as string).toLowerCase() === ADDRESSES.MockDebtorProof.toLowerCase();
  check(
    'policy.debtorProofAdapter() != MockDebtorProof',
    'CRITICAL',
    !isMock,
    isMock
      ? `MOCK ADAPTER STILL WIRED (${debtorAdapter}) — run scripts/upgrade-policy.ts`
      : `${debtorAdapter} ✓`,
  );
  if (!isMock && ADDRESSES.OracleDebtorProof) {
    check(
      'policy.debtorProofAdapter() == OracleDebtorProof',
      'WARN',
      (debtorAdapter as string).toLowerCase() === ADDRESSES.OracleDebtorProof.toLowerCase(),
      `adapter=${debtorAdapter}, expected=${ADDRESSES.OracleDebtorProof}`,
    );
  }

  check('DebtorExposureRegistry.isRegistered(policy)',    'CRITICAL', !!allowedByExp,    String(allowedByExp));
  check('InsuranceClaimsRegistry.isAllowedContract(policy)', 'WARN', !!allowedByClaims, String(allowedByClaims));
  check('ConfidentialPolicyRegistry.isPolicy(policy)',    'WARN',     !!inRegistry,      String(inRegistry));
}

async function checkOracleDebtorProof(): Promise<void> {
  if (!ADDRESSES.OracleDebtorProof) {
    check('OracleDebtorProof address', 'WARN', false, 'ORACLE_DEBTOR_PROOF_ADDRESS not set — run upgrade-policy.ts');
    return;
  }

  console.log(`\n── OracleDebtorProof (${ADDRESSES.OracleDebtorProof}) ─────────`);

  const oracleAddr = await readContract(ADDRESSES.OracleDebtorProof, ORACLE_ABI, 'oracle').catch(() => 'read-error');
  const ownerAddr  = await readContract(ADDRESSES.OracleDebtorProof, ORACLE_ABI, 'owner').catch(() => 'read-error');

  check('oracle.oracle() set', 'WARN',
    oracleAddr !== '0x0000000000000000000000000000000000000000' && oracleAddr !== 'read-error',
    String(oracleAddr));
  check('oracle.owner() set', 'INFO',
    ownerAddr !== '0x0000000000000000000000000000000000000000' && ownerAddr !== 'read-error',
    String(ownerAddr));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [signer] = await ethers.getSigners();
  console.log('=== PROVA Deployment Verification ===');
  console.log('Network :', (await ethers.provider.getNetwork()).name);
  console.log('Signer  :', signer.address);
  console.log('Block   :', await ethers.provider.getBlockNumber());

  await checkConfidentialCoverageManager();
  await checkPool();
  await checkTradeCreditInsurancePolicy();
  await checkOracleDebtorProof();

  // ── Summary ──────────────────────────────────────────────────────────────
  const critical  = results.filter((r) => r.severity === 'CRITICAL' && !r.passed);
  const warnings  = results.filter((r) => r.severity === 'WARN'     && !r.passed);
  const passed    = results.filter((r) => r.passed);

  console.log('\n=== Summary ===');
  console.log(`✅ Passed   : ${passed.length}`);
  console.log(`⚠️  Warnings : ${warnings.length}`);
  console.log(`❌ Critical  : ${critical.length}`);

  if (critical.length > 0) {
    console.log('\nCRITICAL failures — system will NOT function:');
    for (const r of critical) console.log(`  ❌ ${r.name}: ${r.message}`);
    console.log('\nRun: npx hardhat run scripts/repair-pool.ts --network arb-sepolia');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\nWarnings — non-blocking but should be resolved:');
    for (const r of warnings) console.log(`  ⚠️  ${r.name}: ${r.message}`);
  }

  console.log('\n✅ Deployment verification passed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
