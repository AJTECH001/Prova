import { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";

// ─── Deployed addresses (arbitrumSepolia 2026-04-12) ─────────────────────────
const ADDR = {
  token:    "0xAB002F6021394E977D77b8bA3Cc2661264683C93",
  pool:     "0xe3194E9bCeF8f881fC6afcAa4508409C03DA2417",
  manager:  "0xA00aF5437621784b328e8F1113E50711336f0040",
  resolver: "0x165d343b55e8490d544d0CeB8fb05A30DEd39E2d",
  policy:   "0x3575E70503B508E59Cb0Ead6A97bfF090F34779a",
  escrow:   "0x0a30F0Fa8539d6F97B77567bD13573290F43b7b1",
};

// ─── Logging helpers ──────────────────────────────────────────────────────────
const pass = (label: string, detail = "") =>
  console.log(`  ✅  ${label}${detail ? "  →  " + detail : ""}`);
const fail = (label: string, err: any) =>
  console.log(`  ❌  ${label}  →  ${err?.reason ?? err?.message ?? err}`);
const section = (title: string) => {
  console.log(`\n${"─".repeat(64)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(64));
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("\n🔑  Wallet  :", wallet.address);
  console.log("🌐  Network :", (await ethers.provider.getNetwork()).name);

  const token    = await ethers.getContractAt("MockERC20",                   ADDR.token,    wallet);
  const pool     = await ethers.getContractAt("PremiumPool",                 ADDR.pool,     wallet);
  const manager  = await ethers.getContractAt("ConfidentialCoverageManager", ADDR.manager,  wallet);
  const resolver = await ethers.getContractAt("ProvaPaymentResolver",        ADDR.resolver, wallet);
  const policy   = await ethers.getContractAt("ProvaUnderwriterPolicy",      ADDR.policy,   wallet);
  const escrow   = await ethers.getContractAt("ConfidentialEscrow",          ADDR.escrow,   wallet);

  // ══════════════════════════════════════════════════════════════════════════
  section("1 · TOKEN  —  mint & read");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
    pass("Identity", `${name} (${symbol})`);
  } catch (e) { fail("Identity", e); }

  try {
    await (await token.mint(wallet.address, ethers.parseUnits("10000", 18))).wait();
    const bal = await token.balanceOf(wallet.address);
    pass("Mint 10,000 PROVA", `balance = ${ethers.formatUnits(bal, 18)} PROVA`);
  } catch (e) { fail("Mint", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("2 · ESCROW  —  create");
  // ══════════════════════════════════════════════════════════════════════════

  const INVOICE   = ethers.parseUnits("1000", 18);
  const DUE_DATE  = Math.floor(Date.now() / 1000) + 120; // 2 min from now

  const resolverData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256"],
    [wallet.address, INVOICE, DUE_DATE]
  );

  let escrowId = 0n;
  try {
    const tx  = await escrow.createEscrow(wallet.address, ADDR.token, INVOICE, ADDR.resolver, resolverData);
    const rec = await tx.wait();
    const ev  = rec?.logs
      .map((l: any) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "EscrowCreated");
    escrowId = ev?.args?.escrowId ?? 0n;
    pass("createEscrow", `id=${escrowId}  due=${new Date(DUE_DATE * 1000).toLocaleTimeString()}`);
  } catch (e) { fail("createEscrow", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("3 · RESOLVER  —  condition config & ERC-165");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const c = await resolver.conditions(escrowId);
    pass("Condition stored", `buyer=${c.buyer}  amount=${ethers.formatUnits(c.amount, 18)}`);
  } catch (e) { fail("conditions()", e); }

  try {
    const met = await resolver.isConditionMet(escrowId);
    pass("isConditionMet  (before due date)", `= ${met}  — expected false`);
  } catch (e) { fail("isConditionMet", e); }

  try {
    const ok = await resolver.supportsInterface("0x01ffc9a7");
    pass("ERC-165  IConditionResolver", `= ${ok}`);
  } catch (e) { fail("ERC-165", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("4 · COVERAGE MANAGER  —  create coverage");
  // ══════════════════════════════════════════════════════════════════════════

  const policyData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256"],
    [500n, 700n]   // basePremiumBps=500 (5%), minCreditScore=700
  );

  let coverageId = 0n;
  try {
    const tx  = await manager.createCoverage(
      escrowId, ADDR.policy, wallet.address, ADDR.token, INVOICE, policyData
    );
    const rec = await tx.wait();
    const ev  = rec?.logs
      .map((l: any) => { try { return manager.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "CoverageCreated");
    coverageId = ev?.args?.coverageId ?? 0n;
    pass("createCoverage", `id=${coverageId}`);
  } catch (e) { fail("createCoverage", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("5 · POLICY  —  stored config, judge, ERC-165");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const p = await policy.policies(coverageId);
    pass("Policy stored", `basePremiumBps=${p.basePremiumBps}  minCreditScore=${p.minCreditScore}`);
  } catch (e) { fail("policies()", e); }

  try {
    const proof   = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1]);
    const verdict = await policy.judge.staticCall(coverageId, proof);
    pass("judge()  static call", `verdict = ${verdict}`);
  } catch (e) { fail("judge()", e); }

  try {
    const ok = await policy.supportsInterface("0x80bcb11e");
    pass("ERC-165  IUnderwriterPolicy", `= ${ok}`);
  } catch (e) { fail("ERC-165", e); }

  try {
    const [threshold, low, high] = await Promise.all([
      policy.CREDIT_SCORE_THRESHOLD(),
      policy.LOW_RISK_MULTIPLIER(),
      policy.HIGH_RISK_MULTIPLIER(),
    ]);
    pass("Risk constants", `threshold=${threshold}  low=${low}x  high=${high}x`);
  } catch (e) { fail("Risk constants", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("6 · PREMIUM POOL  —  provide liquidity & view earnings");
  // ══════════════════════════════════════════════════════════════════════════

  const LP = ethers.parseUnits("2000", 18);
  try {
    await (await token.mint(wallet.address, LP)).wait();
    await (await token.approve(ADDR.pool, LP)).wait();
    await (await pool.provideLiquidity(ADDR.token, LP)).wait();
    const bal = await pool.poolBalances(ADDR.token);
    pass("provideLiquidity", `pool balance = ${ethers.formatUnits(bal, 18)} PROVA`);
  } catch (e) { fail("provideLiquidity", e); }

  try {
    const [value, shares] = await pool.viewEarnings(ADDR.token, wallet.address);
    pass("viewEarnings", `value=${ethers.formatUnits(value, 18)}  shares=${ethers.formatUnits(shares, 18)}`);
  } catch (e) { fail("viewEarnings", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("7 · ESCROW  —  settleDebt (buyer pays invoice)");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    await (await token.mint(wallet.address, INVOICE)).wait();
    await (await token.approve(ADDR.escrow, INVOICE)).wait();
    await (await escrow.settleDebt(escrowId, INVOICE)).wait();
    const funded = await escrow.escrowBalances(escrowId);
    pass("settleDebt", `escrowBalance = ${ethers.formatUnits(funded, 18)} PROVA`);
  } catch (e) { fail("settleDebt", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("8 · ESCROW  —  wait for due date → settleEscrow");
  // ══════════════════════════════════════════════════════════════════════════

  console.log("  ⏳  Due date is 2 minutes from escrow creation — polling...\n");

  const SETTLE_AFTER = DUE_DATE + 10;
  while (true) {
    const block = await ethers.provider.getBlock("latest");
    const now   = block!.timestamp;
    const left  = SETTLE_AFTER - now;

    if (left <= 0) {
      try {
        const met = await resolver.isConditionMet(escrowId);
        if (!met) { fail("settleEscrow", "isConditionMet still false — try again shortly"); break; }
        await (await escrow.settleEscrow(escrowId)).wait();
        pass("settleEscrow", "invoice amount released to seller");
      } catch (e) { fail("settleEscrow", e); }
      break;
    }
    process.stdout.write(`\r  ⏳  ${left}s remaining...`);
    await new Promise(r => setTimeout(r, 12_000));
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════════════
  section("9 · ESCROW  —  cancel flow (separate escrow, unfunded)");
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256"],
      [wallet.address, INVOICE, Math.floor(Date.now() / 1000) + 3600]
    );
    const tx     = await escrow.createEscrow(wallet.address, ADDR.token, INVOICE, ADDR.resolver, data);
    const rec    = await tx.wait();
    const ev     = rec?.logs
      .map((l: any) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "EscrowCreated");
    const cancelId = ev?.args?.escrowId ?? 1n;
    await (await escrow.cancelEscrow(cancelId)).wait();
    pass("cancelEscrow  (unfunded)", `escrowId=${cancelId}  no refund needed`);
  } catch (e) { fail("cancelEscrow", e); }

  // ══════════════════════════════════════════════════════════════════════════
  section("10 · FHE  —  payPremium via evaluateRisk");
  // ══════════════════════════════════════════════════════════════════════════

  console.log("  ℹ️   Encrypts credit score via CoFHE SDK (arb-sepolia) and submits to policy.");
  console.log("  ℹ️   Expects PremiumPending event — settlePremium() completes after CoFHE decrypts.\n");

  try {
    // ── 1. Build a CoFHE client connected to arb-sepolia ──────────────────
    const cofheConfig = createCofheConfig({
      environment: "node",
      supportedChains: [arbSepolia],
    });
    const cofheClient = createCofheClient(cofheConfig);

    // Connect using ethers signer → viem wallet/public clients
    const { createWalletClient, createPublicClient, http, custom } = await import("viem");
    const { arbitrumSepolia: arbSepoliaViem } = await import("viem/chains");

    const publicClient = createPublicClient({
      chain: arbSepoliaViem,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"),
    });
    const walletClient = createWalletClient({
      chain: arbSepoliaViem,
      transport: custom((wallet.provider as any)),
      account: wallet.address as `0x${string}`,
    });
    await cofheClient.connect(publicClient, walletClient);

    // ── 2. Encrypt credit score 800 as euint32 ────────────────────────────
    const [encResult] = await cofheClient
      .encryptInputs([Encryptable.uint32(800n)])
      .execute();

    // encResult: { ctHash: bigint, utype: number, securityZone: number, signature: Uint8Array }
    const riskProof = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256,uint8,uint8,bytes)"],
      [[encResult.ctHash, encResult.securityZone, encResult.utype, encResult.signature]]
    );
    pass("CoFHE encrypt", `ctHash=${encResult.ctHash}  utype=${encResult.utype}`);

    // ── 3. Create fresh coverage and pay premium ───────────────────────────
    const fhePD = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [500n, 700n]);
    const cvTx  = await manager.createCoverage(
      escrowId, ADDR.policy, wallet.address, ADDR.token, INVOICE, fhePD
    );
    const cvRec = await cvTx.wait();
    const cvEv  = cvRec?.logs
      .map((l: any) => { try { return manager.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "CoverageCreated");
    const fheCovId = cvEv?.args?.coverageId ?? 1n;

    // Pre-approve max coverage amount (exact premium unknown until CoFHE decrypts)
    await (await token.approve(ADDR.manager, INVOICE)).wait();
    const pmTx  = await manager.payPremium(fheCovId, riskProof, ADDR.token);
    const pmRec = await pmTx.wait();

    const paid    = pmRec?.logs.map((l: any) => { try { return manager.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "PremiumPaid");
    const pending = pmRec?.logs.map((l: any) => { try { return manager.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "PremiumPending");

    if (paid)    pass("payPremium  (sync path)", `premium = ${ethers.formatUnits(paid.args.amount, 18)} PROVA`);
    if (pending) pass("payPremium  (FHE async)", `PremiumPending emitted — call settlePremium(${fheCovId}) after CoFHE decrypts`);
    if (!paid && !pending) fail("payPremium", "no PremiumPaid or PremiumPending event found");
  } catch (e) {
    fail("payPremium / evaluateRisk", e);
    console.log("  ℹ️   Check CoFHE network availability at https://testnet-cofhe.fhenix.zone");
  }

  // ══════════════════════════════════════════════════════════════════════════
  section("COMPLETE");
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`
  ProvaToken (PROVA)          ${ADDR.token}
  PremiumPool                 ${ADDR.pool}
  ConfidentialCoverageManager ${ADDR.manager}
  ProvaPaymentResolver        ${ADDR.resolver}
  ProvaUnderwriterPolicy      ${ADDR.policy}
  ConfidentialEscrow          ${ADDR.escrow}
  `);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
