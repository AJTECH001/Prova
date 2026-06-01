/**
 * Upgrade TradeCreditInsurancePolicy and atomically whitelist CCM.
 *
 * The deployed impl (0x3e28…) was compiled from a version of TestnetCoreBase
 * that had isAllowedContract() but NOT setAllowedContract() — so CCM can
 * never be whitelisted on that impl. This script deploys a new impl (from the
 * committed code which has setAllowedContract) and uses upgradeToAndCall to
 * whitelist CCM atomically in the same transaction.
 *
 * Storage safety: committed TestnetCoreBase uses the same plain
 * `mapping(address => bool) internal _allowedContracts` layout as the
 * currently deployed impl — no storage migration needed.
 *
 * Run:
 *   npx hardhat run scripts/add-ccm-whitelist.ts --network arb-sepolia
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const UUPS_ABI = [
    "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable",
    "function implementation() external view returns (address)",
];

const POLICY_ABI = [
    "function owner() external view returns (address)",
    "function isAllowedContract(address addr) external view returns (bool)",
    "function setAllowedContract(address addr, bool allowed) external",
];

async function main() {
    console.log("\n=== Add CCM Whitelist to TradeCreditInsurancePolicy ===");
    console.log("Network:", network.name);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const deploymentsDir = path.join(__dirname, "../deployments");
    const recordPath = path.join(deploymentsDir, `${network.name}.json`);
    if (!fs.existsSync(recordPath)) {
        throw new Error(`No deployment record at ${recordPath}`);
    }
    const record = JSON.parse(fs.readFileSync(recordPath, "utf-8"));

    const policyProxyAddress = record.contracts?.TradeCreditInsurancePolicy?.address;
    if (!policyProxyAddress) throw new Error("TradeCreditInsurancePolicy not in deployment record");

    const ccmAddress = process.env.COVERAGE_MANAGER_ADDRESS ?? "0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67";

    console.log("Policy proxy :", policyProxyAddress);
    console.log("CCM address  :", ccmAddress);

    const proxy = new ethers.Contract(policyProxyAddress, UUPS_ABI, deployer);
    const policy = new ethers.Contract(policyProxyAddress, POLICY_ABI, deployer);

    // Verify owner
    const owner = await policy.owner();
    console.log("\nPolicy owner :", owner);
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`Deployer ${deployer.address} is not the policy owner ${owner}`);
    }

    // Check current state
    const alreadyWhitelisted = await policy.isAllowedContract(ccmAddress);
    console.log("CCM whitelisted:", alreadyWhitelisted);
    if (alreadyWhitelisted) {
        console.log("CCM is already whitelisted — nothing to do.");
        return;
    }

    // Deploy new implementation (compiled from committed code with setAllowedContract)
    console.log("\n1/2  Deploying new TradeCreditInsurancePolicy implementation...");
    const TradeCreditInsurancePolicy = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const newImpl = await TradeCreditInsurancePolicy.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log("     New impl:", newImplAddress);

    // Encode setAllowedContract(ccm, true) call to run atomically during upgrade
    const iface = new ethers.Interface(POLICY_ABI);
    const whitelistCalldata = iface.encodeFunctionData("setAllowedContract", [ccmAddress, true]);

    // upgradeToAndCall: upgrades impl AND immediately calls setAllowedContract(ccm, true)
    // msg.sender in the delegate call is the deployer (owner) → onlyOwner passes.
    console.log("\n2/2  Upgrading proxy + whitelisting CCM atomically...");
    const tx = await proxy.upgradeToAndCall(newImplAddress, whitelistCalldata);
    const receipt = await tx.wait();
    console.log("     Tx hash:", receipt?.hash);

    // Verify
    const nowWhitelisted = await policy.isAllowedContract(ccmAddress);
    if (!nowWhitelisted) {
        throw new Error("CCM whitelist verification failed — isAllowedContract still false");
    }
    console.log("     CCM whitelisted ✓");

    // Update deployment record
    record.contracts.TradeCreditInsurancePolicy.implHistory = [
        ...(record.contracts.TradeCreditInsurancePolicy.implHistory ?? []),
        {
            address: newImplAddress,
            upgradedAt: new Date().toISOString(),
            previousImpl: record.contracts.TradeCreditInsurancePolicy.latestImpl ?? "unknown",
            note: "Added setAllowedContract; CCM whitelisted atomically",
        },
    ];
    record.contracts.TradeCreditInsurancePolicy.latestImpl = newImplAddress;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 4));
    console.log("\nDeployment record updated.");

    console.log("\n=== Done ===");
    console.log("CCM", ccmAddress, "is now whitelisted in TradeCreditInsurancePolicy.");
    console.log("You can now retry coverage purchase — the backend will find CCM whitelisted on the next request.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
