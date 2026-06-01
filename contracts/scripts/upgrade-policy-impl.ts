import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const UUPS_ABI = [
    "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable",
    "function implementation() external view returns (address)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    const deploymentsDir = path.join(__dirname, "../../contracts/deployments");
    const recordPath = path.join(deploymentsDir, `${network.name}.json`);
    const record = JSON.parse(fs.readFileSync(recordPath, "utf-8"));
    const policyProxyAddress = record.contracts.TradeCreditInsurancePolicy.address;
    console.log("Policy proxy:", policyProxyAddress);

    console.log("\nDeploying new TradeCreditInsurancePolicy implementation...");
    const Factory = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const newImpl = await Factory.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log("New impl:", newImplAddress);

    const proxy = new ethers.Contract(policyProxyAddress, UUPS_ABI, deployer);
    console.log("\nUpgrading proxy (no reinit needed — just impl swap)...");
    const tx = await proxy.upgradeToAndCall(newImplAddress, "0x");
    const receipt = await tx.wait();
    console.log("Tx hash:", receipt?.hash);

    record.contracts.TradeCreditInsurancePolicy.implHistory = [
        ...(record.contracts.TradeCreditInsurancePolicy.implHistory ?? []),
        {
            address: newImplAddress,
            upgradedAt: new Date().toISOString(),
            previousImpl: record.contracts.TradeCreditInsurancePolicy.latestImpl ?? "unknown",
            note: "Fix evaluateRisk: onlyProvaContract + _policyByEscrow index; 8-field policyData; viaIR",
        },
    ];
    record.contracts.TradeCreditInsurancePolicy.latestImpl = newImplAddress;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 4));

    console.log("\nDone. New impl deployed and proxy upgraded.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
