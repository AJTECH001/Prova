import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Reineira platform addresses (Arbitrum Sepolia) — pre-deployed, no action needed.
// Redeployed 2026-04-27: cofhejs/cofhesdk v0.5.0 FHE engine upgrade.
const REINEIRA = {
    ConfidentialEscrow:          "0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6",
    ConfidentialCoverageManager: "0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67",
    PoolFactory:                 "0xCBD3815244ee96a92B3Ca3C71B6eD9acB3661e80",
    PolicyRegistry:              "0x962A6c7Be4fC765B0E8B601ab4BB210938660190",
    cUSDC:                       "0x42E47f9bA89712C317f60A72C81A610A2b68c48a",
    USDC:                        "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

async function deployProxy(factory: any, initData: string): Promise<{ proxy: any; implAddress: string; proxyAddress: string }> {
    const impl = await factory.deploy();
    await impl.waitForDeployment();
    const implAddress = await impl.getAddress();

    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await ERC1967Proxy.deploy(implAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    return { proxy, implAddress, proxyAddress };
}

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

    // ── 2. DebtorExposureRegistry (UUPS proxy) ───────────────────────────────────
    console.log("2/5  Deploying DebtorExposureRegistry...");
    const DebtorExposureRegistry = await ethers.getContractFactory("DebtorExposureRegistry");
    const exposureInitData = DebtorExposureRegistry.interface.encodeFunctionData("initialize", [deployer.address]);
    const { proxyAddress: exposureRegistryAddress } = await deployProxy(DebtorExposureRegistry, exposureInitData);
    const exposureRegistry = DebtorExposureRegistry.attach(exposureRegistryAddress);
    console.log("     DebtorExposureRegistry :", exposureRegistryAddress);

    // ── 3. InsuranceClaimsRegistry (UUPS proxy) ──────────────────────────────────
    console.log("3/5  Deploying InsuranceClaimsRegistry...");
    const InsuranceClaimsRegistry = await ethers.getContractFactory("InsuranceClaimsRegistry");
    const claimsInitData = InsuranceClaimsRegistry.interface.encodeFunctionData("initialize", [deployer.address]);
    const { proxyAddress: claimsRegistryAddress } = await deployProxy(InsuranceClaimsRegistry, claimsInitData);
    const claimsRegistry = InsuranceClaimsRegistry.attach(claimsRegistryAddress);
    console.log("     InsuranceClaimsRegistry:", claimsRegistryAddress);

    // ── 4. TradeInvoiceResolver (UUPS proxy) ─────────────────────────────────────
    console.log("4/5  Deploying TradeInvoiceResolver...");
    const TradeInvoiceResolver = await ethers.getContractFactory("TradeInvoiceResolver");
    const resolverInitData = TradeInvoiceResolver.interface.encodeFunctionData("initialize", [
        deployer.address,
        REINEIRA.ConfidentialEscrow,
    ]);
    const { proxyAddress: resolverAddress } = await deployProxy(TradeInvoiceResolver, resolverInitData);
    console.log("     TradeInvoiceResolver   :", resolverAddress);

    // ── 5. TradeCreditInsurancePolicy (UUPS proxy) ───────────────────────────────
    console.log("5/5  Deploying TradeCreditInsurancePolicy...");
    const TradeCreditInsurancePolicy = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const policyInitData = TradeCreditInsurancePolicy.interface.encodeFunctionData("initialize", [
        deployer.address,
        mockDebtorProofAddress,
        exposureRegistryAddress,
        claimsRegistryAddress,
        REINEIRA.ConfidentialCoverageManager,
    ]);
    const { proxyAddress: policyAddress } = await deployProxy(TradeCreditInsurancePolicy, policyInitData);
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
                note:    "Encrypted concentration risk tracker (UUPS proxy)",
            },
            InsuranceClaimsRegistry: {
                address: claimsRegistryAddress,
                note:    "Encrypted append-only claim log (UUPS proxy)",
            },
            TradeInvoiceResolver: {
                address: resolverAddress,
                note:    "IConditionResolver — time-based protracted default gate (UUPS proxy)",
            },
            TradeCreditInsurancePolicy: {
                address: policyAddress,
                note:    "IUnderwriterPolicy — FHE risk scoring and claim adjudication (UUPS proxy)",
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
