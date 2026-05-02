// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint64, euint32, euint16, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  FHERiskMath
/// @notice Shared library for FHE-based risk calculation patterns used across insurance policies.
///
///         Centralizes common FHE operations like risk curve evaluation, add-on calculations,
///         and conditional premium adjustments. All functions operate on encrypted values
///         and maintain privacy throughout the computation.
///
/// @dev    This library standardizes FHE risk evaluation patterns to improve auditability,
///         reduce code duplication, and ensure consistent behavior across different
///         insurance product implementations.
library FHERiskMath {

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Number of buckets in the standard risk curve.
    uint8 internal constant NUM_BUCKETS = 6;

    // ─── Errors ──────────────────────────────────────────────────────────────

    error InvalidCurveLength();
    error InvalidScore();

    // ─── Risk Curve Evaluation ───────────────────────────────────────────────

    /// @notice Evaluates an encrypted credit score against a 6-bucket risk curve.
    /// @dev    Implements the standard "climb toward better rates" pattern where
    ///         higher scores get lower premiums. Starts at floor and selects
    ///         progressively better rates for higher scores.
    /// @param  score Encrypted credit score to evaluate.
    /// @param  thresholds Array of 6 encrypted score thresholds (descending order).
    /// @param  premiums Array of 6 encrypted premium rates corresponding to thresholds.
    /// @return Encrypted premium rate in basis points for the given score.
    function evaluateRiskCurve(
        euint32 score,
        euint32[6] memory thresholds,
        euint32[6] memory premiums
    ) internal returns (euint32) {
        // Start at the floor bucket (highest premium for lowest scores)
        euint32 premium = premiums[5];

        // Climb toward better rates as score increases
        for (int8 i = 4; i >= 0; i--) {
            ebool meetsThreshold = FHE.gte(score, thresholds[uint8(i)]);
            premium = FHE.select(meetsThreshold, premiums[uint8(i)], premium);
        }

        FHE.allowThis(premium);
        return premium;
    }

    /// @notice Evaluates an encrypted credit score against a 6-bucket risk curve (optimized).
    /// @dev    Unrolled loop version for gas optimization. Functionally identical to
    ///         evaluateRiskCurve but avoids loop overhead.
    /// @param  score Encrypted credit score to evaluate.
    /// @param  thresholds Array of 6 encrypted score thresholds (descending order).
    /// @param  premiums Array of 6 encrypted premium rates corresponding to thresholds.
    /// @return Encrypted premium rate in basis points for the given score.
    function evaluateRiskCurveOptimized(
        euint32 score,
        euint32[6] memory thresholds,
        euint32[6] memory premiums
    ) internal returns (euint32) {
        // Start at the floor bucket and climb toward better rates
        euint32 premium = premiums[5];

        ebool b4 = FHE.gte(score, thresholds[4]);
        premium = FHE.select(b4, premiums[4], premium);

        ebool b3 = FHE.gte(score, thresholds[3]);
        premium = FHE.select(b3, premiums[3], premium);

        ebool b2 = FHE.gte(score, thresholds[2]);
        premium = FHE.select(b2, premiums[2], premium);

        ebool b1 = FHE.gte(score, thresholds[1]);
        premium = FHE.select(b1, premiums[1], premium);

        ebool b0 = FHE.gte(score, thresholds[0]);
        premium = FHE.select(b0, premiums[0], premium);

        FHE.allowThis(premium);
        return premium;
    }

    // ─── Risk Add-on Calculations ────────────────────────────────────────────

    /// @notice Safely adds two encrypted risk add-ons, handling uninitialized values.
    /// @dev    Treats uninitialized encrypted values as zero before addition.
    ///         Commonly used for country and industry risk add-ons.
    /// @param  addon1 First encrypted add-on value (e.g., country risk).
    /// @param  addon2 Second encrypted add-on value (e.g., industry risk).
    /// @return Combined encrypted add-on value.
    function addRiskAddons(euint16 addon1, euint16 addon2) internal returns (euint32) {
        // Handle uninitialized values as zero
        if (!Common.isInitialized(addon1)) addon1 = FHE.asEuint16(0);
        if (!Common.isInitialized(addon2)) addon2 = FHE.asEuint16(0);

        // Convert to euint32 for addition to prevent overflow
        euint32 combined = FHE.add(FHE.asEuint32(addon1), FHE.asEuint32(addon2));
        FHE.allowThis(combined);
        return combined;
    }

    /// @notice Adds multiple encrypted risk add-ons safely.
    /// @dev    Extends addRiskAddons for three add-on values. Useful for
    ///         country + industry + sector risk combinations.
    /// @param  addon1 First encrypted add-on value.
    /// @param  addon2 Second encrypted add-on value.
    /// @param  addon3 Third encrypted add-on value.
    /// @return Combined encrypted add-on value.
    function addRiskAddons(
        euint16 addon1,
        euint16 addon2,
        euint16 addon3
    ) internal returns (euint32) {
        euint32 firstTwo = addRiskAddons(addon1, addon2);

        if (!Common.isInitialized(addon3)) addon3 = FHE.asEuint16(0);
        euint32 total = FHE.add(firstTwo, FHE.asEuint32(addon3));
        FHE.allowThis(total);
        return total;
    }

    // ─── Premium Finalization ────────────────────────────────────────────────

    /// @notice Combines base premium with risk add-ons and applies conditional adjustments.
    /// @dev    Standard pattern for finalizing premium calculation with add-ons
    ///         and conditional zero-out for policy violations.
    /// @param  basePremium Base encrypted premium from risk curve evaluation.
    /// @param  addOns Combined encrypted risk add-ons.
    /// @param  isValid Encrypted boolean condition (true = valid, false = zero out).
    /// @return Final encrypted premium ready for return to caller.
    function finalizePremium(
        euint32 basePremium,
        euint32 addOns,
        ebool isValid
    ) internal returns (euint32) {
        euint32 totalPremium = FHE.add(basePremium, addOns);

        // Zero out premium if condition not met (e.g., cap breach, invalid policy)
        totalPremium = FHE.select(isValid, totalPremium, FHE.asEuint32(0));

        FHE.allowThis(totalPremium);
        return totalPremium;
    }

    /// @notice Converts finalized euint32 premium to euint64 for external use.
    /// @dev    Many policy interfaces expect euint64 return types. This function
    ///         handles the conversion and ACL permissions.
    /// @param  premium32 Finalized euint32 premium value.
    /// @param  caller Address to grant read permission to.
    /// @return Premium converted to euint64 with proper ACL permissions.
    function convertToEuint64(euint32 premium32, address caller) internal returns (euint64) {
        euint64 premium64 = FHE.asEuint64(premium32);
        FHE.allowThis(premium64);
        FHE.allow(premium64, caller);
        return premium64;
    }

    // ─── Validation Helpers ───────────────────────────────────────────────────

    /// @notice Validates that encrypted score is within reasonable bounds.
    /// @dev    Checks score against maximum reasonable value to catch
    ///         invalid inputs or computation errors.
    /// @param  score Encrypted score to validate.
    /// @param  maxScore Maximum allowed score value.
    /// @return Encrypted boolean indicating if score is valid.
    function validateScore(euint32 score, uint32 maxScore) internal returns (ebool) {
        euint32 maxScoreEnc = FHE.asEuint32(maxScore);
        FHE.allowThis(maxScoreEnc);
        return FHE.lte(score, maxScoreEnc);
    }

    /// @notice Validates that premium is within reasonable bounds.
    /// @dev    Prevents unreasonable premium calculations that could indicate
    ///         computation errors or malicious inputs.
    /// @param  premium Encrypted premium to validate.
    /// @param  maxPremiumBps Maximum allowed premium in basis points.
    /// @return Encrypted boolean indicating if premium is valid.
    function validatePremium(euint32 premium, uint32 maxPremiumBps) internal returns (ebool) {
        euint32 maxPremiumEnc = FHE.asEuint32(maxPremiumBps);
        FHE.allowThis(maxPremiumEnc);
        return FHE.lte(premium, maxPremiumEnc);
    }

    // ─── Utility Functions ────────────────────────────────────────────────────

    /// @notice Creates an encrypted zero value of specified type with proper ACL.
    /// @dev    Utility for creating initialized zero values in FHE computations.
    /// @return Encrypted zero value as euint32.
    function encryptedZero32() internal returns (euint32) {
        euint32 zero = FHE.asEuint32(0);
        FHE.allowThis(zero);
        return zero;
    }

    /// @notice Creates an encrypted zero value as euint16 with proper ACL.
    /// @return Encrypted zero value as euint16.
    function encryptedZero16() internal returns (euint16) {
        euint16 zero = FHE.asEuint16(0);
        FHE.allowThis(zero);
        return zero;
    }

    /// @notice Creates an encrypted boolean true value with proper ACL.
    /// @return Encrypted true value.
    function encryptedTrue() internal returns (ebool) {
        ebool trueVal = FHE.asEbool(true);
        FHE.allowThis(trueVal);
        return trueVal;
    }

    /// @notice Creates an encrypted boolean false value with proper ACL.
    /// @return Encrypted false value.
    function encryptedFalse() internal returns (ebool) {
        ebool falseVal = FHE.asEbool(false);
        FHE.allowThis(falseVal);
        return falseVal;
    }
}