// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../interfaces/IUnderwriterPolicy.sol";
import {FHE, euint16, euint32, InEuint32, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title ProvaUnderwriterPolicy
/// @notice FHE-based underwriter policy for PROVA.
/// @dev Best practices followed:
///      - FHE.allowThis() called on every encrypted value after creation (including intermediates)
///      - Encrypted constants pre-computed once in constructor and reused (not re-encrypted per call)
///      - Minimum bit-width: euint16 used for all values that fit within 0–65535
///      - No branching on encrypted data — FHE.select() used for conditional logic
contract ProvaUnderwriterPolicy is IUnderwriterPolicy, ERC165 {
    struct Policy {
        uint256 basePremiumBps;
        uint256 minCreditScore;
        bool set;
    }

    mapping(uint256 => Policy) public policies;

    uint256 public constant CREDIT_SCORE_THRESHOLD = 700;
    uint256 public constant HIGH_RISK_MULTIPLIER   = 2;
    uint256 public constant LOW_RISK_MULTIPLIER    = 1;

    /// @dev Pre-encrypted constants — initialised once in constructor and reused.
    ///      Re-encrypting on every call wastes gas; encrypt once, FHE.allowThis(), reuse.
    euint16 private _encThreshold;  // encrypted 700
    euint16 private _encLowMult;    // encrypted 1
    euint16 private _encHighMult;   // encrypted 2

    event PolicySet(uint256 indexed coverageId, uint256 basePremiumBps, uint256 minCreditScore);

    constructor() {
        // Encrypt the three constants once at deployment.
        // Minimum bit-width: all values fit in uint16 (max 65535).
        _encThreshold = FHE.asEuint16(uint16(CREDIT_SCORE_THRESHOLD));
        FHE.allowThis(_encThreshold);

        _encLowMult = FHE.asEuint16(uint16(LOW_RISK_MULTIPLIER));
        FHE.allowThis(_encLowMult);

        _encHighMult = FHE.asEuint16(uint16(HIGH_RISK_MULTIPLIER));
        FHE.allowThis(_encHighMult);
    }

    function onPolicySet(uint256 coverageId, bytes calldata data) external override {
        require(!policies[coverageId].set, "Policy already set");

        (uint256 basePremiumBps, uint256 minCreditScore) = abi.decode(data, (uint256, uint256));
        require(basePremiumBps > 0 && basePremiumBps <= 10000, "Invalid base premium");
        require(minCreditScore > 0, "Invalid min credit score");

        policies[coverageId] = Policy({
            basePremiumBps: basePremiumBps,
            minCreditScore: minCreditScore,
            set: true
        });

        emit PolicySet(coverageId, basePremiumBps, minCreditScore);
    }

    /// @notice Evaluate risk using FHE and submit an async decrypt task.
    /// @dev FHE best practices applied:
    ///      1. allowThis() called on every encrypted value immediately after creation.
    ///      2. Pre-encrypted constants reused (not re-created each call).
    ///      3. euint16 used for minimum bit-width throughout.
    ///      4. FHE.select() used — no branching on encrypted data.
    ///      5. FHE.decrypt() submits async task — result delivered by threshold network.
    function evaluateRisk(uint256 coverageId, bytes calldata riskProof) external override returns (uint256) {
        Policy memory policy = policies[coverageId];
        require(policy.set, "Policy not set");

        // Decode the encrypted credit score and verify it with the TaskManager.
        // Cast from euint32 (wire format) to euint16 (minimum sufficient bit-width).
        InEuint32 memory encryptedInput = abi.decode(riskProof, (InEuint32));
        euint32 creditScore32 = FHE.asEuint32(encryptedInput);
        FHE.allowThis(creditScore32);

        euint16 creditScore = FHE.asEuint16(creditScore32);
        FHE.allowThis(creditScore);

        // isLowRisk = (creditScore >= 700) — computed on encrypted value, no plaintext exposed
        ebool isLowRisk = FHE.gte(creditScore, _encThreshold);
        FHE.allowThis(isLowRisk);

        // multiplier = isLowRisk ? 1 : 2 — constant-time, no branching
        euint16 multiplier = FHE.select(isLowRisk, _encLowMult, _encHighMult);
        FHE.allowThis(multiplier);

        // basePremiumBps is per-policy so must be encrypted per call (cannot be pre-computed)
        euint16 basePremiumEnc = FHE.asEuint16(uint16(policy.basePremiumBps));
        FHE.allowThis(basePremiumEnc);

        // riskScoreBps = basePremiumBps * multiplier (encrypted)
        // Result: 500 * 1 = 500 bps (low risk) or 500 * 2 = 1000 bps (high risk)
        euint16 riskScore = FHE.mul(basePremiumEnc, multiplier);
        FHE.allowThis(riskScore);
        FHE.allow(riskScore, msg.sender); // allow CoverageManager to access the ciphertext

        // Submit async decrypt task to the CoFHE threshold network.
        // CoverageManager must call settlePremium() after decryption completes.
        FHE.decrypt(riskScore);

        // Return the ciphertext handle as uint256 (interface return type).
        // euint16 wraps bytes32 in this CoFHE version; reinterpret via assembly.
        bytes32 handle = euint16.unwrap(riskScore);
        uint256 handleAsUint;
        assembly { handleAsUint := handle }
        return handleAsUint;
    }

    function judge(uint256, bytes calldata) external override returns (bool) {
        // Simplified: always approve for demo
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId || super.supportsInterface(interfaceId);
    }
}
