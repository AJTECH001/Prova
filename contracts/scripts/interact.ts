/**
 * PROVA — End-to-end integration script
 *
 * Flow:
 *   1. Create an insurance pool (Reineira PoolFactory)
 *   2. Add ProvaUnderwriterPolicy to the pool
 *   3. Stake liquidity into the pool
 *   4. Create an escrow with ProvaPaymentResolver + pool insurance
 *   5. Fund the escrow
 *   6. Wait for resolver condition → redeem
 *
 * Prerequisites:
 *   - ProvaPaymentResolver and ProvaUnderwriterPolicy already deployed
 *   - PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL set in .env
 */

import { ReineiraSDK } from "@reineira-os/sdk";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// ── Your deployed plugin contracts ────────────────────────────────────────────
// Fill these in after running: npx hardhat run scripts/deploy.ts --network arbitrumSepolia
const DEPLOYED = {
  resolver: process.env.RESOLVER_ADDRESS ?? "",
  policy:   process.env.POLICY_ADDRESS   ?? "",
};

// ── Logging helpers ───────────────────────────────────────────────────────────
const pass    = (label: string, detail = "") =>
  console.log(`  ✅  ${label}${detail ? "  →  " + detail : ""}`);
const fail    = (label: string, err: any) =>
  console.log(`  ❌  ${label}  →  ${err?.reason ?? err?.message ?? err}`);
const section = (title: string) => {
  console.log(`\n${"─".repeat(64)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(64));
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!DEPLOYED.resolver || !DEPLOYED.policy) {
    console.error(
      "Set RESOLVER_ADDRESS and POLICY_ADDRESS in .env (run deploy.ts first)"
    );
    process.exit(1);
  }

  const [wallet] = await ethers.getSigners();
  console.log("\n🔑  Wallet  :", wallet.address);
  console.log("🌐  Network :", (await ethers.provider.getNetwork()).name);

  // ── Initialize Reineira SDK ───────────────────────────────────────────────
  const sdk = ReineiraSDK.create({
    network: "testnet",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL!,
    privateKey: process.env.PRIVATE_KEY!,
  });
  await sdk.initialize();
  pass("SDK initialized");

  // ══════════════════════════════════════════════════════════════════════════
  section("1 · Create Insurance Pool");
  // ══════════════════════════════════════════════════════════════════════════
  // Creates a new pool via Reineira's PoolFactory.
  // cUSDC (confidential USDC) is the payment token on Arbitrum Sepolia.

  let pool: any;
  try {
    pool = await sdk.insurance.createPool({
      paymentToken: sdk.addresses.confidentialUSDC,
    });
    pass("createPool", `id=${pool.id}  address=${pool.address}`);
  } catch (e) { fail("createPool", e); process.exit(1); }

  // ══════════════════════════════════════════════════════════════════════════
  section("2 · Add TradeCreditInsurancePolicy to pool");
  // ══════════════════════════════════════════════════════════════════════════
  // The pool must whitelist the policy before any coverage can be purchased.

  try {
    await pool.addPolicy(DEPLOYED.policy);
    pass("addPolicy", DEPLOYED.policy);
  } catch (e) { fail("addPolicy", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("3 · Stake liquidity into the pool");
  // ══════════════════════════════════════════════════════════════════════════
  // Staked liquidity backs the coverage sold by this pool.
  // Premiums accumulate in the pool as coverage is purchased.

  let stakeId: any;
  const STAKE_AMOUNT = sdk.usdc(5000);
  try {
    const { stakeId: id } = await pool.stake(STAKE_AMOUNT, { autoApprove: true });
    stakeId = id;
    pass("stake", `stakeId=${stakeId}  amount=5000 USDC`);
  } catch (e) { fail("stake", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("4 · Build resolver data for TradeInvoiceResolver");
  // ══════════════════════════════════════════════════════════════════════════
  // TradeInvoiceResolver.onConditionSet(escrowId, data) expects:
  //   abi.encode(address buyer, address seller, uint256 invoiceAmount,
  //              uint256 dueDate, uint256 waitingPeriod)
  // waitingPeriod must be between 30 days and 180 days (MIN/MAX_WAITING_PERIOD).

  const INVOICE_AMOUNT  = sdk.usdc(1000);
  const DUE_DATE        = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
  const WAITING_PERIOD  = 30 * 24 * 60 * 60; // 30 days (minimum per policy)
  const COVERAGE_EXPIRY = Math.floor(Date.now() / 1000) + 86400 * 90; // 90 days

  const resolverData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256", "uint256", "uint256"],
    [wallet.address, wallet.address, INVOICE_AMOUNT, DUE_DATE, WAITING_PERIOD]
  );
  pass("resolverData encoded", `buyer=${wallet.address}  dueDate=${new Date(DUE_DATE * 1000).toISOString()}`);

  // ══════════════════════════════════════════════════════════════════════════
  section("5 · Create Escrow with resolver + insurance");
  // ══════════════════════════════════════════════════════════════════════════
  // Full create: sets ProvaPaymentResolver as condition, attaches pool coverage.

  let escrow: any;
  try {
    escrow = await sdk.escrow.create({
      amount:       INVOICE_AMOUNT,
      owner:        wallet.address,
      resolver:     DEPLOYED.resolver,
      resolverData: resolverData,
      insurance: {
        pool:           pool.address,
        policy:         DEPLOYED.policy,
        coverageAmount: INVOICE_AMOUNT,
        expiry:         COVERAGE_EXPIRY,
      },
    });
    pass("createEscrow", `id=${escrow.id}`);
    pass("coverage",     `id=${escrow.coverage?.id}`);
  } catch (e) { fail("createEscrow", e); process.exit(1); }

  // ══════════════════════════════════════════════════════════════════════════
  section("6 · Fund escrow");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    await escrow.fund(INVOICE_AMOUNT, { autoApprove: true });
    const funded = await escrow.isFunded();
    pass("fund", `isFunded=${funded}`);
  } catch (e) { fail("fund", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("7 · Poll resolver → redeem when condition met");
  // ══════════════════════════════════════════════════════════════════════════
  // isConditionMet() returns true once block.timestamp >= dueDate.
  // In production this would be called after the 24 h due date passes.
  // For a quick smoke-test, check the current state and report.

  try {
    const conditionMet = await escrow.isConditionMet();
    const redeemable   = await escrow.isRedeemable();
    pass("isConditionMet", `= ${conditionMet}  (due date: ${new Date(DUE_DATE * 1000).toISOString()})`);
    pass("isRedeemable",   `= ${redeemable}`);

    if (redeemable) {
      await escrow.redeem();
      pass("redeem", "funds released to owner");
    } else {
      console.log("  ℹ️   Condition not yet met — call escrow.redeem() after due date passes.");
      console.log(`  ℹ️   Escrow ID: ${escrow.id}`);
    }
  } catch (e) { fail("redeem check", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("SUMMARY");
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`
  TradeInvoiceResolver       ${DEPLOYED.resolver}
  TradeCreditInsurancePolicy ${DEPLOYED.policy}
  Pool                    ${pool?.address}
  Escrow ID               ${escrow?.id}
  Coverage ID             ${escrow?.coverage?.id}

  Reineira platform (pre-deployed):
    ConfidentialEscrow          0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa
    ConfidentialCoverageManager 0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6
    PoolFactory                 0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD
    PolicyRegistry              0xf421363B642315BD3555dE2d9BD566b7f9213c8E
  `);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
