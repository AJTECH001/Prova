/**
 * Admin script: set a debtor concentration cap on TradeCreditInsurancePolicy.
 *
 * This MUST be run by the policy owner before any coverage can be purchased for a buyer.
 * The contract reverts with ConcentrationCapNotSet if the cap is not set.
 *
 * How debtorId is derived (must match buy-coverage.use-case.ts):
 *   debtorId = bytes32(uint160(buyerWalletAddress))
 *   i.e. the buyer's address left-padded to 32 bytes.
 *
 * Usage:
 *   BUYER_ADDRESS=0xYourBuyerWallet \
 *   POLICY_ADDRESS=0xYourPolicyAddress \
 *   npx hardhat run scripts/set-concentration-cap.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

const POLICY_ABI = [
    "function setConcentrationCap(bytes32 debtorId, uint64 cap) external",
    "function owner() external view returns (address)",
];

async function main() {
    const buyerAddress = process.env.BUYER_ADDRESS;
    const policyAddress = process.env.POLICY_ADDRESS ?? "0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5";
    // Cap in USDC smallest units (6 decimals). Default: 1,000,000 USDC.
    const capUsdc = Number(process.env.CAP_USDC ?? "1000000");
    const capSmallest = BigInt(capUsdc) * BigInt(10 ** 6);

    if (!buyerAddress) {
        throw new Error("Set BUYER_ADDRESS env var to the buyer's wallet address");
    }

    // Derive debtorId: bytes32(uint160(address)) — left-pad address to 32 bytes
    const addrHex = buyerAddress.toLowerCase().replace("0x", "");
    const debtorId = ("0x" + addrHex.padStart(64, "0")) as `0x${string}`;

    console.log("Policy address  :", policyAddress);
    console.log("Buyer address   :", buyerAddress);
    console.log("DebtorId        :", debtorId);
    console.log("Cap (USDC units):", capUsdc.toLocaleString(), "USDC");
    console.log("Cap (smallest)  :", capSmallest.toString());

    const [signer] = await ethers.getSigners();
    const policy = new ethers.Contract(policyAddress, POLICY_ABI, signer);

    const owner = await policy.owner();
    console.log("\nContract owner  :", owner);
    console.log("Signer address  :", signer.address);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        throw new Error("Signer is not the contract owner — only owner can set concentration caps");
    }

    console.log("\nSending setConcentrationCap transaction...");
    const tx = await policy.setConcentrationCap(debtorId, capSmallest);
    console.log("Tx hash         :", tx.hash);
    await tx.wait();
    console.log("✓ Concentration cap set successfully");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
