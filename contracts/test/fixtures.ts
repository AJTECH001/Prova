import { ethers } from "hardhat";

export const DEFAULT_WAITING_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds

export async function deployProvaFixture() {
    const [owner, seller, buyer, stranger] = await ethers.getSigners();

    // ── Moat contracts ────────────────────────────────────────────────────────

    const MockAdapter = await ethers.getContractFactory("MockDebtorProof");
    const mockAdapter = await MockAdapter.deploy();
    await mockAdapter.waitForDeployment();

    const Registry = await ethers.getContractFactory("DebtorExposureRegistry");
    const exposureRegistry = await Registry.deploy();
    await exposureRegistry.waitForDeployment();
    await exposureRegistry.initialize(owner.address);

    const History = await ethers.getContractFactory("ProvaLossHistory");
    const lossHistory = await History.deploy();
    await lossHistory.waitForDeployment();
    await lossHistory.initialize(owner.address);

    // ── Core contracts ────────────────────────────────────────────────────────

    const Resolver = await ethers.getContractFactory("ProvaPaymentResolver");
    const resolver = await Resolver.deploy();
    await resolver.waitForDeployment();
    await resolver.initialize(owner.address);

    const Policy = await ethers.getContractFactory("ProvaUnderwriterPolicy");
    const policy = await Policy.deploy();
    await policy.waitForDeployment();
    await policy.initialize(
        owner.address,
        await mockAdapter.getAddress(),
        await exposureRegistry.getAddress(),
        await lossHistory.getAddress(),
    );
    await policy.setConcentrationCap(DEFAULT_DEBTOR_ID, 2n ** 63n - 1n);

    // Register policy in moat contracts so it can write to them.
    await exposureRegistry.registerContract(await policy.getAddress());
    await lossHistory.registerPolicy(await policy.getAddress());

    // Cast to any — typechain types are not generated for these contracts yet.
    return {
        owner,
        seller,
        buyer,
        stranger,
        resolver:         resolver as any,
        policy:           policy as any,
        mockAdapter:      mockAdapter as any,
        exposureRegistry: exposureRegistry as any,
        lossHistory:      lossHistory as any,
    };
}

// ─── ABI encoding helpers ─────────────────────────────────────────────────────

/**
 * Encode resolver condition data.
 * (buyer, seller, invoiceAmount, dueDate, waitingPeriod)
 * waitingPeriod defaults to 7 days (R4: configurable per escrow).
 */
export function encodeConditionData(
    buyer: string,
    seller: string,
    invoiceAmount: bigint,
    dueDate: number,
    waitingPeriod: number = DEFAULT_WAITING_PERIOD,
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint256", "uint256", "uint256"],
        [buyer, seller, invoiceAmount, dueDate, waitingPeriod],
    );
}

/**
 * Encode policy data.
 * (debtorId, buyerCreditLimit, coveragePercentageBps, countryCode, industryCode, invoiceAmount)
 *
 * T5: basePremiumBps, countryRiskBps, industryRiskBps are no longer in calldata.
 *     They come from on-chain lookup tables set by the owner.
 */
export function encodePolicyData(
    debtorId: string,
    poolId: string,
    buyerCreditLimit: bigint,
    coveragePercentageBps: number,
    countryCode: string,
    industryCode: string,
    invoiceAmount: bigint,
): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint64", "uint16", "bytes2", "bytes4", "uint64"],
        [debtorId, poolId, buyerCreditLimit, coveragePercentageBps, countryCode, industryCode, invoiceAmount],
    );
}

/** Encode a mock InEuint32 for FHE evaluateRisk calls (mock environment only). */
export function encodeMockInEuint32(ctHash: bigint = 99999n): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256,uint8,uint8,bytes)"],
        [buildMockInEuint32(ctHash)],
    );
}

/** Construct a raw InEuint32 tuple struct for direct contract calls (mock only). */
export function buildMockInEuint32(ctHash: bigint = 99999n): [bigint, number, number, string] {
    return [ctHash, 0, 4, "0x"];
}

/** Construct a raw InEuint16 tuple struct for direct contract calls (mock only). */
export function buildMockInEuint16(ctHash: bigint = 99999n): [bigint, number, number, string] {
    return [ctHash, 0, 2, "0x"];
}

/**
 * Encode a mock InEuint64 for FHE judge calls (mock environment only).
 * FHE.asEuint64(InEuint64) requires a CoFHE-sealed ciphertext — this mock will
 * revert on local Hardhat. Used only to document the expected call shape in tests.
 */
export function encodeMockInEuint64(ctHash: bigint = 99999n): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256,uint8,uint8,bytes)"],
        [[ctHash, 0, 8, "0x"]],
    );
}

// ─── Default test policy data ─────────────────────────────────────────────────

export const DEFAULT_DEBTOR_ID = ethers.keccak256(ethers.toUtf8Bytes("BUYER_001"));
export const DEFAULT_POOL_ID = "0x0000000000000000000000000000000000001337";
export const DEFAULT_CREDIT_LIMIT = 200_000n * 10n ** 6n; // $200k USDC
export const DEFAULT_COVERAGE_BPS = 9_000;                // 90%
export const DEFAULT_COUNTRY_CODE = "0x4e47";             // "NG" as bytes2
export const DEFAULT_INDUSTRY_CODE = "0x00000000";        // unclassified
export const DEFAULT_INVOICE_AMOUNT = 150_000n * 10n ** 6n; // $150k USDC

export const DEFAULT_POLICY_DATA = encodePolicyData(
    DEFAULT_DEBTOR_ID,
    DEFAULT_POOL_ID,
    DEFAULT_CREDIT_LIMIT,
    DEFAULT_COVERAGE_BPS,
    DEFAULT_COUNTRY_CODE,
    DEFAULT_INDUSTRY_CODE,
    DEFAULT_INVOICE_AMOUNT,
);
