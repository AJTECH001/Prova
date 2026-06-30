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

// ERC-2771 trusted forwarder. Default disabled (address(0)) — no gasless meta-tx.
// To enable gasless flows, set TRUSTED_FORWARDER to Reineira's forwarder (query via MCP).
const TRUSTED_FORWARDER = process.env.TRUSTED_FORWARDER ?? ethers.ZeroAddress;

// Oracle signer authorised to submit encrypted credit scores to OracleDebtorProof.
// Defaults to the deployer; in production set ORACLE_ADDRESS to the backend signer.
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;

// Optional production ownership target. When set to a valid address, ownership of every
// deployed contract is handed to it AFTER wiring. CoreBase contracts use Ownable2Step, so
// the multisig must call acceptOwnership() to finalise; OracleDebtorProof (plain Ownable)
// transfers immediately. Leave unset to keep the deployer as owner (e.g. on testnet).
const MULTISIG_OWNER = process.env.MULTISIG_OWNER;

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
    console.log("\n=== PROVA Contract Deployment (production profile) ===");
    console.log("Network:", network.name);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    const oracleSigner = ORACLE_ADDRESS && ethers.isAddress(ORACLE_ADDRESS) ? ORACLE_ADDRESS : deployer.address;
    console.log("Trusted forwarder:", TRUSTED_FORWARDER, TRUSTED_FORWARDER === ethers.ZeroAddress ? "(meta-tx disabled)" : "");
    console.log("Oracle signer    :", oracleSigner, oracleSigner === deployer.address ? "(deployer — set ORACLE_ADDRESS in production)" : "");
    console.log("");

    // ── 1. OracleDebtorProof (production IDebtorProof adapter; plain Ownable) ─────
    //    Replaces the testnet-only MockDebtorProof. The oracle signer submits CoFHE-
    //    encrypted credit scores; the policy reads them as FHE handles via getScore().
    console.log("1/5  Deploying OracleDebtorProof...");
    const OracleDebtorProof = await ethers.getContractFactory("OracleDebtorProof");
    const oracleDebtorProof = await OracleDebtorProof.deploy(deployer.address, oracleSigner);
    await oracleDebtorProof.waitForDeployment();
    const debtorProofAddress = await oracleDebtorProof.getAddress();
    console.log("     OracleDebtorProof      :", debtorProofAddress);

    // ── 2. DebtorExposureRegistry (UUPS proxy) ───────────────────────────────────
    console.log("2/5  Deploying DebtorExposureRegistry...");
    const DebtorExposureRegistry = await ethers.getContractFactory("DebtorExposureRegistry");
    const exposureInitData = DebtorExposureRegistry.interface.encodeFunctionData("initialize", [
        deployer.address,
        TRUSTED_FORWARDER,
    ]);
    const { proxyAddress: exposureRegistryAddress } = await deployProxy(DebtorExposureRegistry, exposureInitData);
    const exposureRegistry = DebtorExposureRegistry.attach(exposureRegistryAddress);
    console.log("     DebtorExposureRegistry :", exposureRegistryAddress);

    // ── 3. InsuranceClaimsRegistry (UUPS proxy) ──────────────────────────────────
    console.log("3/5  Deploying InsuranceClaimsRegistry...");
    const InsuranceClaimsRegistry = await ethers.getContractFactory("InsuranceClaimsRegistry");
    const claimsInitData = InsuranceClaimsRegistry.interface.encodeFunctionData("initialize", [
        deployer.address,
        TRUSTED_FORWARDER,
    ]);
    const { proxyAddress: claimsRegistryAddress } = await deployProxy(InsuranceClaimsRegistry, claimsInitData);
    const claimsRegistry = InsuranceClaimsRegistry.attach(claimsRegistryAddress);
    console.log("     InsuranceClaimsRegistry:", claimsRegistryAddress);

    // ── 4. TradeInvoiceResolver (UUPS proxy) ─────────────────────────────────────
    console.log("4/5  Deploying TradeInvoiceResolver...");
    const TradeInvoiceResolver = await ethers.getContractFactory("TradeInvoiceResolver");
    const resolverInitData = TradeInvoiceResolver.interface.encodeFunctionData("initialize", [
        deployer.address,
        REINEIRA.ConfidentialEscrow,
        TRUSTED_FORWARDER,
    ]);
    const { proxyAddress: resolverAddress } = await deployProxy(TradeInvoiceResolver, resolverInitData);
    const resolver = TradeInvoiceResolver.attach(resolverAddress);
    console.log("     TradeInvoiceResolver   :", resolverAddress);

    // ── 5. TradeCreditInsurancePolicy (UUPS proxy) ───────────────────────────────
    console.log("5/5  Deploying TradeCreditInsurancePolicy...");
    const TradeCreditInsurancePolicy = await ethers.getContractFactory("TradeCreditInsurancePolicy");
    const policyInitData = TradeCreditInsurancePolicy.interface.encodeFunctionData("initialize", [
        deployer.address,
        debtorProofAddress,
        exposureRegistryAddress,
        claimsRegistryAddress,
        TRUSTED_FORWARDER, // NOTE: the ERC-2771 forwarder — NOT the coverage manager.
    ]);
    const { proxyAddress: policyAddress } = await deployProxy(TradeCreditInsurancePolicy, policyInitData);
    const policy = TradeCreditInsurancePolicy.attach(policyAddress);
    console.log("     TradeCreditInsurancePolicy:", policyAddress);

    // ── Wiring ─────────────────────────────────────────────────────────────────────
    console.log("\nWiring contracts...");
    await (await exposureRegistry.registerContract(policyAddress)).wait();
    console.log("     exposureRegistry.registerContract(policy)            ✓");
    await (await claimsRegistry.registerPolicy(policyAddress)).wait();
    console.log("     claimsRegistry.registerPolicy(policy)                ✓");
    // The coverage manager calls onPolicySet/evaluateRisk (onlyProvaContract), so it must be
    // whitelisted in the policy's Moat registry — without this, coverage issuance reverts.
    await (await policy.setAllowedContract(REINEIRA.ConfidentialCoverageManager, true)).wait();
    console.log("     policy.setAllowedContract(coverageManager, true)     ✓");

    // ── Optional: hand ownership to a production multisig/timelock ───────────────────
    if (MULTISIG_OWNER && ethers.isAddress(MULTISIG_OWNER)) {
        console.log("\nTransferring ownership to", MULTISIG_OWNER, "...");
        // CoreBase contracts (Ownable2Step): nominates pending owner — multisig must acceptOwnership().
        await (await exposureRegistry.transferOwnership(MULTISIG_OWNER)).wait();
        await (await claimsRegistry.transferOwnership(MULTISIG_OWNER)).wait();
        await (await resolver.transferOwnership(MULTISIG_OWNER)).wait();
        await (await policy.transferOwnership(MULTISIG_OWNER)).wait();
        console.log("     4 CoreBase contracts: pending owner set — multisig must call acceptOwnership()");
        // OracleDebtorProof (plain Ownable): immediate transfer.
        await (await oracleDebtorProof.transferOwnership(MULTISIG_OWNER)).wait();
        console.log("     OracleDebtorProof: ownership transferred (immediate)");
    } else {
        console.log("\nOwnership retained by deployer (set MULTISIG_OWNER to hand off in production).");
    }

    // ── Save deployment record ────────────────────────────────────────────────────
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const record = {
        network:    network.name,
        chainId:    Number(chainId),
        deployedAt: new Date().toISOString().split("T")[0],
        deployer:   deployer.address,
        owner:      MULTISIG_OWNER && ethers.isAddress(MULTISIG_OWNER) ? MULTISIG_OWNER : deployer.address,
        trustedForwarder: TRUSTED_FORWARDER,
        contracts: {
            OracleDebtorProof: {
                address: debtorProofAddress,
                note:    "Production IDebtorProof adapter — oracle submits CoFHE-encrypted credit scores",
                oracle:  oracleSigner,
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
                note:    "IConditionResolver — protracted-default gate + payment-truth oracle (UUPS proxy)",
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
    console.log("OracleDebtorProof          :", debtorProofAddress);
    console.log("DebtorExposureRegistry     :", exposureRegistryAddress);
    console.log("InsuranceClaimsRegistry    :", claimsRegistryAddress);
    console.log("TradeInvoiceResolver       :", resolverAddress);
    console.log("TradeCreditInsurancePolicy :", policyAddress);

    console.log("\n=== Next Steps ===");
    console.log("1. Register the policy in Reineira PolicyRegistry → PolicyRegistry.registerPolicy(", policyAddress, ")");
    console.log("2. Create an insurance pool via PoolFactory");
    console.log("3. Create an escrow via ConfidentialEscrow with resolver =", resolverAddress);
    console.log("4. Purchase coverage via ConfidentialCoverageManager with policy =", policyAddress);
    console.log("5. Configure runtime params: setConcentrationCap(debtor, cap), setCurve(...), setPaymentOracle(...)");
    console.log("6. Oracle backend submits scores via OracleDebtorProof.setScore(debtorId, encScore)");
    if (MULTISIG_OWNER && ethers.isAddress(MULTISIG_OWNER)) {
        console.log("7. Multisig must call acceptOwnership() on the 4 CoreBase contracts to finalise handoff");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
