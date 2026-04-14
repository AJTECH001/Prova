import { ethers } from "hardhat";

export async function deployProvaFixture() {
    const [owner, seller, buyer, stranger] = await ethers.getSigners();

    const Resolver = await ethers.getContractFactory("ProvaPaymentResolver");
    const resolver = await Resolver.deploy();
    await resolver.waitForDeployment();

    const Policy = await ethers.getContractFactory("ProvaUnderwriterPolicy");
    const policy = await Policy.deploy();
    await policy.waitForDeployment();

    // Cast to any — typechain types are not generated for these contracts yet.
    return { owner, seller, buyer, stranger, resolver: resolver as any, policy: policy as any };
}

// ─── ABI encoding helpers ─────────────────────────────────────────────────────

/** Encode resolver condition data: (buyer, seller, invoiceAmount, dueDate) */
export function encodeConditionData(
    buyer: string,
    seller: string,
    invoiceAmount: bigint,
    dueDate: number,
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256", "uint256"],
        [buyer, seller, invoiceAmount, dueDate],
    );
}

/** Encode policy data: (buyerCreditLimit, coveragePercentageBps, basePremiumBps, countryRiskBps, industryRiskBps) */
export function encodePolicyData(
    buyerCreditLimit: bigint,
    coveragePercentageBps: number,
    basePremiumBps: number,
    countryRiskBps: number,
    industryRiskBps: number,
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint16", "uint16", "uint16", "uint16"],
        [buyerCreditLimit, coveragePercentageBps, basePremiumBps, countryRiskBps, industryRiskBps],
    );
}

/** Encode a mock InEuint32 for FHE evaluateRisk calls (mock environment only). */
export function encodeMockInEuint32(ctHash: bigint = 99999n): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256,uint8,uint8,bytes)"],
        [[ctHash, 0, 4, "0x"]],
    );
}

/** Encode dispute proof: (claimAmount) */
export function encodeDisputeProof(claimAmount: bigint): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [claimAmount]);
}
