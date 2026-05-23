/**
 * Upgrade TradeCreditInsurancePolicy and wire OracleDebtorProof.
 *
 * What this script does:
 *  1. Deploys OracleDebtorProof with deployer as both owner and initial oracle.
 *  2. Deploys a new TradeCreditInsurancePolicy implementation.
 *  3. Calls upgradeToAndCall on the existing proxy (UUPS — only callable by proxy owner).
 *  4. Calls policy.setDebtorProofAdapter(oracleAddress) to replace MockDebtorProof.
 *  5. Updates deployments/<network>.json with new addresses.
 *
 * Storage layout safety:
 *  - No storage variables were added, removed, or reordered in TradeCreditInsurancePolicy.
 *  - IDebtorProof interface change only affects the ABI, not the storage layout.
 *  - setDebtorProofAdapter is a new function — safe UUPS upgrade.
 *
 * Rollback strategy:
 *  - The previous implementation address is logged before upgrade.
 *  - To roll back: call proxy.upgradeToAndCall(<previousImpl>, "") from the proxy owner.
 *  - All existing policy state (_policies, _concentrationCaps, _encThresholds, etc.)
 *    is preserved through the upgrade — no migration needed.
 *
 * Run:
 *   npx hardhat run scripts/upgrade-policy.ts --network arb-sepolia
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Minimal UUPS proxy ABI — only functions needed for the upgrade.
const UUPS_ABI = [
    "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable",
    "function implementation() external view returns (address)",
];

// Minimal policy ABI — only admin functions called after upgrade.
const POLICY_ABI = [
    "function setDebtorProofAdapter(address newAdapter) external",
    "function debtorProofAdapter() external view returns (address)",
    "function owner() external view returns (address)",
];

async function main() {
    console.log("\n=== TradeCreditInsurancePolicy Upgrade ===");
    console.log("Network:", network.name);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ── Load existing deployment record ────────────────────────────────────────
    const deploymentsDir = path.join(__dirname, "../deployments");
    const recordPath = path.join(deploymentsDir, `${network.name}.json`);
    if (!fs.existsSync(recordPath)) {
        throw new Error(`No deployment record found at ${recordPath}. Run deploy.ts first.`);
    }
    const record = JSON.parse(fs.readFileSync(recordPath, "utf-8"));
    const policyProxyAddress = record.contracts?.TradeCreditInsurancePolicy?.address;
    if (!policyProxyAddress) {
        throw new Error("TradeCreditInsurancePolicy address not found in deployment record.");
    }
    console.log("Policy proxy:", policyProxyAddress);

    // ── 1. Deploy OracleDebtorProof ────────────────────────────────────────────
    console.log("\n1/4  Deploying OracleDebtorProof...");
    console.log("     Owner  :", deployer.address);
    console.log("     Oracle :", deployer.address, "(rotate via setOracle after backend key is ready)");

    const OracleDebtorProof = await ethers.getContractFactory("OracleDebtorProof");
    const oracle = await OracleDebtorProof.deploy(deployer.address, deployer.address);
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log("     OracleDebtorProof:", oracleAddress);

    // ── 2. Deploy new TradeCreditInsurancePolicy implementation ────────────────
    console.log("\n2/4  Deploying new TradeCreditInsurancePolicy implementation...");
    const TradeCreditInsurancePolicy = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const newImpl = await TradeCreditInsurancePolicy.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log("     New implementation:", newImplAddress);

    // Log previous implementation for rollback reference.
    const proxy = new ethers.Contract(policyProxyAddress, UUPS_ABI, deployer);
    let previousImpl: string;
    try {
        previousImpl = await proxy.implementation();
        console.log("     Previous impl (rollback target):", previousImpl);
    } catch {
        previousImpl = "unknown";
        console.log("     Previous impl: not readable via ERC-1967 slot (proxy may differ)");
    }

    // ── 3. Upgrade proxy to new implementation ─────────────────────────────────
    console.log("\n3/4  Upgrading proxy...");
    const upgradeTx = await proxy.upgradeToAndCall(newImplAddress, "0x");
    const upgradeReceipt = await upgradeTx.wait();
    console.log("     Upgrade tx:", upgradeReceipt?.hash);

    // ── 4. Wire OracleDebtorProof as the debtor proof adapter ─────────────────
    console.log("\n4/4  Setting debtor proof adapter → OracleDebtorProof...");
    const policy = new ethers.Contract(policyProxyAddress, POLICY_ABI, deployer);

    const currentAdapter = await policy.debtorProofAdapter();
    console.log("     Current adapter:", currentAdapter, "(was MockDebtorProof)");

    const setAdapterTx = await policy.setDebtorProofAdapter(oracleAddress);
    const setAdapterReceipt = await setAdapterTx.wait();
    console.log("     setDebtorProofAdapter tx:", setAdapterReceipt?.hash);

    const verifiedAdapter = await policy.debtorProofAdapter();
    if (verifiedAdapter.toLowerCase() !== oracleAddress.toLowerCase()) {
        throw new Error(`Adapter not set correctly. Got: ${verifiedAdapter}`);
    }
    console.log("     Adapter verified ✓:", verifiedAdapter);

    // ── Update deployment record ───────────────────────────────────────────────
    record.contracts.OracleDebtorProof = {
        address: oracleAddress,
        note: "Production IDebtorProof oracle adapter — replace MockDebtorProof",
    };
    record.contracts.TradeCreditInsurancePolicy.implHistory = [
        ...(record.contracts.TradeCreditInsurancePolicy.implHistory ?? []),
        { address: newImplAddress, upgradedAt: new Date().toISOString(), previousImpl },
    ];
    record.contracts.TradeCreditInsurancePolicy.latestImpl = newImplAddress;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 4));
    console.log("\nDeployment record updated at deployments/" + network.name + ".json");

    // ── Post-upgrade checklist ─────────────────────────────────────────────────
    console.log("\n=== Post-Upgrade Checklist ===");
    console.log("✓ OracleDebtorProof deployed    :", oracleAddress);
    console.log("✓ Policy impl upgraded          :", newImplAddress);
    console.log("✓ debtorProofAdapter wired      :", verifiedAdapter);
    console.log("");
    console.log("Next steps:");
    console.log("1. Add to backend .env:");
    console.log("   ORACLE_DEBTOR_PROOF_ADDRESS=" + oracleAddress);
    console.log("");
    console.log("2. If backend wallet differs from deployer, rotate oracle:");
    console.log("   oracle.setOracle(<backend-wallet-address>)");
    console.log("   Run: npx hardhat run scripts/set-oracle.ts --network arb-sepolia");
    console.log("");
    console.log("3. Set initial encrypted scores for registered debtors:");
    console.log("   npx hardhat run scripts/set-oracle-score.ts --network arb-sepolia");
    console.log("   (or let ensureDebtorRegistered in the backend handle it automatically)");
    console.log("");
    console.log("4. Verify deployment health:");
    console.log("   npx hardhat run scripts/verify-deployment.ts --network arb-sepolia");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
