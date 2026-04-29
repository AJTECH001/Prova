import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Reineira platform addresses (Arbitrum Sepolia) — pre-deployed, no action needed.
const REINEIRA = {
    ConfidentialEscrow:          "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
    ConfidentialCoverageManager: "0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
    PoolFactory:                 "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
    PolicyRegistry:              "0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
    cUSDC:                       "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
    USDC:                        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

async function main() {
    console.log("\n=== PROVA Contract Deployment ===");
    console.log("Network:", network.name);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ── 1. MockDebtorProof (testnet adapter — replace with real oracle on mainnet) ──
    console.log("1/5  Deploying MockDebtorProof...");
    const MockDebtorProof = await ethers.getContractFactory("MockDebtorProof");
    const mockDebtorProof = await MockDebtorProof.deploy();
    await mockDebtorProof.waitForDeployment();
    const mockDebtorProofAddress = await mockDebtorProof.getAddress();
    console.log("     MockDebtorProof        :", mockDebtorProofAddress);

    // ── 2. DebtorExposureRegistry ─────────────────────────────────────────────────
    console.log("2/5  Deploying DebtorExposureRegistry...");
    const DebtorExposureRegistry = await ethers.getContractFactory("DebtorExposureRegistry");
    const exposureRegistry = await DebtorExposureRegistry.deploy();
    await exposureRegistry.waitForDeployment();
    const exposureRegistryAddress = await exposureRegistry.getAddress();
    await (await exposureRegistry.initialize(deployer.address)).wait();
    console.log("     DebtorExposureRegistry :", exposureRegistryAddress);

    // ── 3. InsuranceClaimsRegistry ────────────────────────────────────────────────
    console.log("3/5  Deploying InsuranceClaimsRegistry...");
    const InsuranceClaimsRegistry = await ethers.getContractFactory("InsuranceClaimsRegistry");
    const claimsRegistry = await InsuranceClaimsRegistry.deploy();
    await claimsRegistry.waitForDeployment();
    const claimsRegistryAddress = await claimsRegistry.getAddress();
    await (await claimsRegistry.initialize(deployer.address)).wait();
    console.log("     InsuranceClaimsRegistry:", claimsRegistryAddress);

    // ── 4. TradeInvoiceResolver ───────────────────────────────────────────────────
    console.log("4/5  Deploying TradeInvoiceResolver...");
    const TradeInvoiceResolver = await ethers.getContractFactory("TradeInvoiceResolver");
    const resolver = await TradeInvoiceResolver.deploy();
    await resolver.waitForDeployment();
    const resolverAddress = await resolver.getAddress();
    await (await resolver.initialize(deployer.address)).wait();
    console.log("     TradeInvoiceResolver   :", resolverAddress);

    // ── 5. TradeCreditInsurancePolicy ─────────────────────────────────────────────
    console.log("5/5  Deploying TradeCreditInsurancePolicy...");
    const TradeCreditInsurancePolicy = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const policy = await TradeCreditInsurancePolicy.deploy();
    await policy.waitForDeployment();
    const policyAddress = await policy.getAddress();
    await (await policy.initialize(
        deployer.address,
        mockDebtorProofAddress,
        exposureRegistryAddress,
        claimsRegistryAddress,
    )).wait();
    console.log("     TradeCreditInsurancePolicy:", policyAddress);

    // ── Wire registry contracts ───────────────────────────────────────────────────
    console.log("\nWiring registry contracts...");
    await (await exposureRegistry.registerContract(policyAddress)).wait();
    console.log("     exposureRegistry.registerContract(policy) ✓");
    await (await claimsRegistry.registerPolicy(policyAddress)).wait();
    console.log("     claimsRegistry.registerPolicy(policy)     ✓");

    // ── Save deployment record ────────────────────────────────────────────────────
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const record = {
        network:    network.name,
        chainId:    Number(chainId),
        deployedAt: new Date().toISOString().split("T")[0],
        deployer:   deployer.address,
        contracts: {
            MockDebtorProof: {
                address: mockDebtorProofAddress,
                note:    "Testnet-only IDebtorProof adapter — replace with real oracle on mainnet",
            },
            DebtorExposureRegistry: {
                address: exposureRegistryAddress,
                note:    "Encrypted concentration risk tracker",
            },
            InsuranceClaimsRegistry: {
                address: claimsRegistryAddress,
                note:    "Encrypted append-only claim log",
            },
            TradeInvoiceResolver: {
                address: resolverAddress,
                note:    "IConditionResolver — time-based protracted default gate",
            },
            TradeCreditInsurancePolicy: {
                address: policyAddress,
                note:    "IUnderwriterPolicy — FHE risk scoring and claim adjudication",
            },
        },
        reineira: REINEIRA,
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
    const outPath = path.join(deploymentsDir, `${network.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 4));
    console.log("\nDeployment record saved to deployments/" + network.name + ".json");

    // ── Summary ───────────────────────────────────────────────────────────────────
    console.log("\n=== Deployment Summary ===");
    console.log("MockDebtorProof            :", mockDebtorProofAddress);
    console.log("DebtorExposureRegistry     :", exposureRegistryAddress);
    console.log("InsuranceClaimsRegistry    :", claimsRegistryAddress);
    console.log("TradeInvoiceResolver       :", resolverAddress);
    console.log("TradeCreditInsurancePolicy :", policyAddress);
    console.log("\n=== Reineira Platform (pre-deployed) ===");
    console.log("ConfidentialEscrow         :", REINEIRA.ConfidentialEscrow);
    console.log("ConfidentialCoverageManager:", REINEIRA.ConfidentialCoverageManager);
    console.log("PoolFactory                :", REINEIRA.PoolFactory);
    console.log("PolicyRegistry             :", REINEIRA.PolicyRegistry);
    console.log("\n=== Next Steps ===");
    console.log("1. Register TradeCreditInsurancePolicy in Reineira PolicyRegistry");
    console.log("   → PolicyRegistry.registerPolicy(", policyAddress, ")");
    console.log("2. Create an insurance pool via PoolFactory");
    console.log("3. Create an escrow via ConfidentialEscrow with resolver =", resolverAddress);
    console.log("4. Purchase coverage via ConfidentialCoverageManager with policy =", policyAddress);
    console.log("5. Replace MockDebtorProof with a real oracle before mainnet");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
