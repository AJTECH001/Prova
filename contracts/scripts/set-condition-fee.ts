/**
 * Admin script: activate Prova's platform revenue by setting the condition fee on
 * TradeInvoiceResolver.
 *
 * This is Prova's first live revenue lever. The resolver only *declares* the fee
 * (bps + recipient) via setConditionFee; the ReineiraOS protocol stamps and collects
 * it from the escrow creator during ConfidentialEscrow.create() (RSS §5.5.1). Until
 * this is set, conditionFeeBps defaults to 0 and Prova collects nothing.
 *
 * Fee flows to FEE_RECIPIENT (Prova treasury). bps is basis points (100 = 1%, max 10000).
 *
 * Usage:
 *   CONDITION_FEE_BPS=50 \                       # 0.50% of invoice at escrow creation
 *   FEE_RECIPIENT=0xYourProvaTreasury \          # required when bps > 0
 *   RESOLVER_ADDRESS=0xYourResolver \            # defaults to the deployed arb-sepolia resolver
 *   npx hardhat run scripts/set-condition-fee.ts --network arbitrumSepolia
 *
 * To disable the fee again: CONDITION_FEE_BPS=0 (FEE_RECIPIENT ignored).
 */

import { ethers } from "hardhat";

const RESOLVER_ABI = [
    "function setConditionFee(uint16 bps, address recipient) external",
    "function getConditionFee() external view returns (uint16 bps, address recipient)",
    "function owner() external view returns (address)",
];

const MAX_BPS = 10000;

async function main() {
    const resolverAddress =
        process.env.RESOLVER_ADDRESS ?? "0xfca7715a2C38E13Ecfa2f934E4B70758d0304738";

    if (process.env.CONDITION_FEE_BPS === undefined) {
        throw new Error("Set CONDITION_FEE_BPS (e.g. 50 for 0.50%; 0 to disable)");
    }
    const bps = Number(process.env.CONDITION_FEE_BPS);
    if (!Number.isInteger(bps) || bps < 0 || bps > MAX_BPS) {
        throw new Error(`CONDITION_FEE_BPS must be an integer in [0, ${MAX_BPS}] (got "${process.env.CONDITION_FEE_BPS}")`);
    }

    // recipient must be a valid non-zero address when bps > 0; when disabling (bps == 0)
    // the contract accepts address(0), so we default to it.
    let recipient = process.env.FEE_RECIPIENT ?? ethers.ZeroAddress;
    if (bps > 0) {
        if (!process.env.FEE_RECIPIENT || !ethers.isAddress(process.env.FEE_RECIPIENT)) {
            throw new Error("Set FEE_RECIPIENT to a valid Prova treasury address when CONDITION_FEE_BPS > 0");
        }
        recipient = ethers.getAddress(process.env.FEE_RECIPIENT);
    }

    console.log("Resolver address:", resolverAddress);
    console.log("New fee (bps)   :", bps, `(${(bps / 100).toFixed(2)}%)`, bps === 0 ? "— DISABLED" : "");
    console.log("Fee recipient   :", recipient);

    const [signer] = await ethers.getSigners();
    const resolver = new ethers.Contract(resolverAddress, RESOLVER_ABI, signer);

    const owner = await resolver.owner();
    console.log("\nContract owner  :", owner);
    console.log("Signer address  :", signer.address);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        throw new Error("Signer is not the resolver owner — only owner can set the condition fee");
    }

    const [curBps, curRecipient] = await resolver.getConditionFee();
    console.log("\nCurrent fee     :", Number(curBps), "bps →", curRecipient);
    if (Number(curBps) === bps && curRecipient.toLowerCase() === recipient.toLowerCase()) {
        console.log("✓ Already set to the requested value — nothing to do (idempotent).");
        return;
    }

    console.log("\nSending setConditionFee transaction...");
    const tx = await resolver.setConditionFee(bps, recipient);
    console.log("Tx hash         :", tx.hash);
    await tx.wait();

    const [newBps, newRecipient] = await resolver.getConditionFee();
    console.log(`✓ Condition fee set: ${Number(newBps)} bps → ${newRecipient}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
