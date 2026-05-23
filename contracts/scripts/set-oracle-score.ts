/**
 * Set an encrypted credit score for a debtor in OracleDebtorProof.
 *
 * This script:
 *  1. Initializes the CoFHE client against Arbitrum Sepolia.
 *  2. Encrypts the credit score via cofheClient.encryptInputs([Encryptable.uint32(score)]).
 *  3. Calls OracleDebtorProof.setScore(debtorId, { ctHash, securityZone, utype, signature }).
 *  4. Verifies hasScore(debtorId) returns true.
 *
 * Usage:
 *   DEBTOR_ID=0x000...walletAddress SCORE=750 \
 *     npx hardhat run scripts/set-oracle-score.ts --network arb-sepolia
 *
 * Environment variables:
 *   ORACLE_ADDRESS   — OracleDebtorProof contract (defaults to deployments/<network>.json)
 *   DEBTOR_ID        — bytes32 debtorId (0x-prefixed, 66 chars)
 *   SCORE            — plaintext uint32 credit score (0–1000, default 750)
 *
 * Score → premium mapping (default curve):
 *   >= 800 → 150 bps (1.5%)    >= 720 → 200 bps (2.0%)
 *   >= 650 → 280 bps (2.8%)    >= 580 → 400 bps (4.0%)
 *   >= 500 → 600 bps (6.0%)      < 500 → 1000 bps (10%)
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const ORACLE_ABI = parseAbi([
    "function setScore(bytes32 debtorId, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encScore) external",
    "function hasScore(bytes32 debtorId) external view returns (bool)",
]);

async function main() {
    console.log("\n=== Set Oracle Debtor Score ===");
    console.log("Network:", network.name);

    // ── Configuration ──────────────────────────────────────────────────────────
    const debtorId = process.env.DEBTOR_ID;
    if (!debtorId || !debtorId.startsWith("0x") || debtorId.length !== 66) {
        throw new Error(
            "DEBTOR_ID env var required: 0x-prefixed bytes32, e.g. 0x000...walletAddress (66 chars)",
        );
    }

    const score = parseInt(process.env.SCORE ?? "750", 10);
    if (isNaN(score) || score < 0 || score > 1000) {
        throw new Error("SCORE must be 0–1000");
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY env var required");

    // ── Resolve oracle address ─────────────────────────────────────────────────
    let oracleAddress = process.env.ORACLE_ADDRESS;
    if (!oracleAddress) {
        const recordPath = path.join(__dirname, "../deployments", `${network.name}.json`);
        if (!fs.existsSync(recordPath)) {
            throw new Error("ORACLE_ADDRESS not set and no deployment record found");
        }
        const record = JSON.parse(fs.readFileSync(recordPath, "utf-8"));
        oracleAddress = record.contracts?.OracleDebtorProof?.address;
        if (!oracleAddress) {
            throw new Error(
                "OracleDebtorProof not in deployment record. Run upgrade-policy.ts first.",
            );
        }
    }
    console.log("Oracle   :", oracleAddress);
    console.log("DebtorId :", debtorId);
    console.log("Score    :", score, "(plaintext — will be CoFHE-encrypted before submission)");

    // ── Initialize CoFHE client ────────────────────────────────────────────────
    console.log("\nInitializing CoFHE client...");

    const { createCofheConfig, createCofheClient } = await import("@cofhe/sdk/node");
    const { arbSepolia } = await import("@cofhe/sdk/chains");
    const adapters = await import("@cofhe/sdk/adapters");
    const WagmiAdapter = (adapters as any).WagmiAdapter ?? (adapters as any).default?.WagmiAdapter;

    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const viemPublicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
    });
    const viemWalletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
    });

    const cofheConfig = createCofheConfig({ supportedChains: [arbSepolia] });
    const cofheClient = createCofheClient(cofheConfig);

    const { publicClient: cofhePublic, walletClient: cofheWallet } =
        await WagmiAdapter(viemWalletClient, viemPublicClient);
    await cofheClient.connect(cofhePublic, cofheWallet);

    console.log("CoFHE client connected ✓");

    // ── Encrypt the credit score ────────────────────────────────────────────────
    console.log("\nEncrypting score via CoFHE...");

    const { Encryptable } = await import("@cofhe/sdk");
    const [encResult] = await (cofheClient as any)
        .encryptInputs([Encryptable.uint32(score)])
        .execute();

    console.log("Encryption complete:");
    console.log("  ctHash      :", encResult.ctHash.toString());
    console.log("  securityZone:", encResult.securityZone);
    console.log("  utype       :", encResult.utype);
    console.log("  sig length  :", encResult.signature?.length ?? 0, "bytes");

    if (!encResult.ctHash || encResult.ctHash === 0n) {
        throw new Error("Encryption produced zero ctHash — CoFHE client not properly connected");
    }
    if (!encResult.signature || encResult.signature.length === 0) {
        throw new Error("Encryption produced empty signature — inputProof missing");
    }

    // ── Submit to OracleDebtorProof ────────────────────────────────────────────
    console.log("\nSubmitting setScore to OracleDebtorProof...");

    const hash = await viemWalletClient.writeContract({
        address: oracleAddress as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: "setScore",
        args: [
            debtorId as `0x${string}`,
            {
                ctHash:       encResult.ctHash,
                securityZone: encResult.securityZone,
                utype:        encResult.utype,
                signature:    encResult.signature as `0x${string}`,
            },
        ],
    });
    await viemPublicClient.waitForTransactionReceipt({ hash });
    console.log("setScore tx:", hash);

    // ── Verify ────────────────────────────────────────────────────────────────
    const hasScore = await viemPublicClient.readContract({
        address: oracleAddress as `0x${string}`,
        abi: parseAbi(["function hasScore(bytes32) external view returns (bool)"]),
        functionName: "hasScore",
        args: [debtorId as `0x${string}`],
    });

    if (!hasScore) {
        throw new Error("Post-submission check failed: hasScore() returned false");
    }
    console.log("\n✓ Score verified on-chain: hasScore() = true");
    console.log("  Debtor", debtorId, "can now purchase coverage.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
