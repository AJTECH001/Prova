// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint32, euint16, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {FHERiskMath} from "../lib/FHERiskMath.sol";

/// @title  MockFHERiskMathExample
/// @notice Example contract demonstrating FHERiskMath library usage.
/// @dev    Shows how different insurance products can reuse the shared
///         FHE risk evaluation patterns for consistent behavior.
contract MockFHERiskMathExample {

    // Example: Equipment Finance Risk Evaluation
    function evaluateEquipmentRisk(
        euint32 creditScore,
        euint32[6] memory thresholds,
        euint32[6] memory premiums,
        euint16 equipmentAge,
        euint16 industryRisk
    ) external returns (euint64 riskScore) {
        // 1. Evaluate base premium using shared curve logic
        euint32 basePremium = FHERiskMath.evaluateRiskCurveOptimized(
            creditScore,
            thresholds,
            premiums
        );

        // 2. Add equipment-specific risk factors
        euint32 addOns = FHERiskMath.addRiskAddons(equipmentAge, industryRisk);

        // 3. Finalize with validation (always valid in this example)
        euint32 finalPremium = FHERiskMath.finalizePremium(
            basePremium,
            addOns,
            FHERiskMath.encryptedTrue()
        );

        // 4. Convert to required return type
        return FHERiskMath.convertToEuint64(finalPremium, msg.sender);
    }

    // Example: Supply Chain Insurance
    function evaluateSupplyChainRisk(
        euint32 supplierScore,
        euint32[6] memory riskCurve,
        euint32[6] memory premiums,
        euint16 geographicRisk,
        euint16 sectorRisk,
        euint16 complexityRisk,
        ebool hasInsuranceHistory
    ) external returns (euint64 riskScore) {
        // Use the same shared patterns for different insurance product
        euint32 basePremium = FHERiskMath.evaluateRiskCurveOptimized(
            supplierScore,
            riskCurve,
            premiums
        );

        // Combine three risk factors using shared library
        euint32 addOns = FHERiskMath.addRiskAddons(
            geographicRisk,
            sectorRisk,
            complexityRisk
        );

        euint32 finalPremium = FHERiskMath.finalizePremium(
            basePremium,
            addOns,
            hasInsuranceHistory
        );

        return FHERiskMath.convertToEuint64(finalPremium, msg.sender);
    }
}