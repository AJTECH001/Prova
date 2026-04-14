// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../interfaces/IUnderwriterPolicy.sol";
import {FHE, euint64, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";



/// @title  ProvaUnderwriterPolicy
/// @notice FHE-based underwriter policy for PROVA trade credit insurance.
///         Evaluates buyer risk using an encrypted credit score and judges disputes
///         against a per-coverage credit limit.
contract ProvaUnderwriterPolicy is IUnderwriterPolicy, ERC165 {

    // ─── Errors ──────────────────────────────────────────────────────────────

    error PolicyAlreadySet(uint256 coverageId);
    error PolicyNotSet(uint256 coverageId);
    error InvalidCreditLimit();
    error InvalidCoveragePercentage();
    error InvalidBasePremium();

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @notice Policy parameters set by the seller when purchasing coverage.
    struct Policy {
        uint256 buyerCreditLimit;      // max payout the pool will ever pay for this buyer
        uint16  coveragePercentageBps; // share of invoice covered (e.g. 9000 = 90%)
        uint16  basePremiumBps;        // base cost of coverage (e.g. 200 = 2%)
        uint16  countryRiskBps;        // add-on for buyer's country risk
        uint16  industryRiskBps;       // add-on for buyer's sector risk
        bool    set;
    }

    mapping(uint256 => Policy) public policies;

    // ─── FHE constants ───────────────────────────────────────────────────────

    // Encrypted as euint32 — minimum bit-width for values that never exceed 10000.
    // Pre-encrypted once in constructor and reused across all evaluateRisk calls.
    euint32 private _encThreshold; // credit score threshold: 600
    euint32 private _encLowMult;   // multiplier for low-risk buyers: 1
    euint32 private _encHighMult;  // multiplier for high-risk buyers: 2

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a policy is registered. Terms are intentionally omitted
    ///         to avoid leaking credit limit and premium data on-chain.
    event PolicySet(uint256 indexed coverageId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Pre-encrypts FHE constants used in risk evaluation.
    constructor() {
        _encThreshold = FHE.asEuint32(600);
        FHE.allowThis(_encThreshold);

        _encLowMult = FHE.asEuint32(1);
        FHE.allowThis(_encLowMult);

        _encHighMult = FHE.asEuint32(2);
        FHE.allowThis(_encHighMult);
    }

    // ─── IUnderwriterPolicy ──────────────────────────────────────────────────

    /// @notice Stores coverage policy parameters when a seller purchases insurance.
    /// @dev    data = abi.encode(uint256 buyerCreditLimit, uint16 coveragePercentageBps,
    ///                           uint16 basePremiumBps, uint16 countryRiskBps, uint16 industryRiskBps)
    function onPolicySet(uint256 coverageId, bytes calldata data) external override {
        if (policies[coverageId].set) revert PolicyAlreadySet(coverageId);

        (
            uint256 buyerCreditLimit,
            uint16  coveragePercentageBps,
            uint16  basePremiumBps,
            uint16  countryRiskBps,
            uint16  industryRiskBps
        ) = abi.decode(data, (uint256, uint16, uint16, uint16, uint16));

        if (buyerCreditLimit == 0)                           revert InvalidCreditLimit();
        if (coveragePercentageBps == 0 ||
            coveragePercentageBps > 10000)                   revert InvalidCoveragePercentage();
        if (basePremiumBps == 0 || basePremiumBps > 2000)    revert InvalidBasePremium();

        policies[coverageId] = Policy({
            buyerCreditLimit:      buyerCreditLimit,
            coveragePercentageBps: coveragePercentageBps,
            basePremiumBps:        basePremiumBps,
            countryRiskBps:        countryRiskBps,
            industryRiskBps:       industryRiskBps,
            set:                   true
        });

        emit PolicySet(coverageId);
    }

    /// @notice Calculates an encrypted premium in basis points from the buyer's encrypted credit score.
    /// @dev    riskProof = abi.encode(InEuint32 encryptedCreditScore)
    ///         Formula: (basePremiumBps × multiplier) + countryRiskBps + industryRiskBps
    ///         Multiplier = 1 if score >= 600, 2 if score < 600. Computed entirely in FHE.
    function evaluateRisk(uint256 coverageId, bytes calldata riskProof)
        external
        override
        returns (euint64 riskScore)
    {
        Policy memory p = policies[coverageId];
        if (!p.set) revert PolicyNotSet(coverageId);

        // Decode and seal the buyer's encrypted credit score (euint32 — scores never exceed 850).
        InEuint32 memory encInput = abi.decode(riskProof, (InEuint32));
        euint32 creditScore = FHE.asEuint32(encInput);
        FHE.allowThis(creditScore);

        // Constant-time risk tier: no branching on encrypted data (best practice).
        // isLowRisk = creditScore >= 600; multiplier = 1 if low-risk, 2 if high-risk.
        ebool isLowRisk = FHE.gte(creditScore, _encThreshold);
        FHE.allowThis(isLowRisk);

        euint32 multiplier = FHE.select(isLowRisk, _encLowMult, _encHighMult);
        FHE.allowThis(multiplier);

        // All intermediate values stay in euint32 (minimum bit-width best practice).
        euint32 basePremiumEnc = FHE.asEuint32(uint32(p.basePremiumBps));
        FHE.allowThis(basePremiumEnc);

        euint32 adjustedBase = FHE.mul(basePremiumEnc, multiplier);
        FHE.allowThis(adjustedBase);

        euint32 addOns = FHE.asEuint32(uint32(p.countryRiskBps) + uint32(p.industryRiskBps));
        FHE.allowThis(addOns);

        euint32 total32 = FHE.add(adjustedBase, addOns);
        FHE.allowThis(total32);

        // Upcast to euint64 only here — required by IUnderwriterPolicy interface.
        riskScore = FHE.asEuint64(total32);
        FHE.allowThis(riskScore);
        FHE.allow(riskScore, msg.sender);
    }

    /// @notice Validates a dispute by checking the claim amount against the buyer's credit limit.
    /// @dev    disputeProof = abi.encode(uint256 claimAmount)
    ///         Returns encrypted true if claimAmount <= buyerCreditLimit, encrypted false otherwise.
    function judge(uint256 coverageId, bytes calldata disputeProof)
        external
        override
        returns (ebool valid)
    {
        Policy memory p = policies[coverageId];
        if (!p.set) revert PolicyNotSet(coverageId);

        (uint256 claimAmount) = abi.decode(disputeProof, (uint256));

        bool withinLimit = claimAmount <= p.buyerCreditLimit;

        valid = FHE.asEbool(withinLimit);
        FHE.allowThis(valid);
        FHE.allow(valid, msg.sender);
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    /// @notice Declares IUnderwriterPolicy support so ConfidentialCoverageManager can verify this contract.
    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
