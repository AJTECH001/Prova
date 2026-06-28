// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint64, euint32, euint16, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  FHERiskMath
/// @notice Shared library for FHE-based risk calculation patterns used by insurance policies.
///
///         Centralizes the FHE operations used to price coverage: risk-curve evaluation,
///         add-on combination, and conditional premium finalization. All functions operate
///         on encrypted values and maintain privacy throughout the computation.
///
/// @dev    Only the functions exercised by the active policy flow are kept here. Prior
///         speculative helpers (unoptimized curve, validators, encrypted-constant factories,
///         3-input add-on) were removed to minimize the audited FHE surface.
library FHERiskMath {

    // ─── Risk Curve Evaluation ───────────────────────────────────────────────

    /// @notice Evaluates an encrypted credit score against a 6-bucket risk curve.
    /// @dev    Unrolled "climb toward better rates" pattern: starts at the floor premium
    ///         (highest, for the lowest scores) and selects a lower premium for each
    ///         threshold the score meets. Thresholds are in descending order.
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

    /// @notice Converts a finalized euint32 premium to euint64 for external use.
    /// @dev    Policy interfaces expect euint64 return types. Handles the conversion
    ///         and ACL permissions for the caller.
    /// @param  premium32 Finalized euint32 premium value.
    /// @param  caller Address to grant read permission to.
    /// @return Premium converted to euint64 with proper ACL permissions.
    function convertToEuint64(euint32 premium32, address caller) internal returns (euint64) {
        euint64 premium64 = FHE.asEuint64(premium32);
        FHE.allowThis(premium64);
        FHE.allow(premium64, caller);
        return premium64;
    }
}
