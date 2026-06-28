// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {TradeCreditInsurancePolicy} from "../policies/TradeCreditInsurancePolicy.sol";

/// @title  PolicyHarness
/// @notice Test-only harness standing in for the ConfidentialCoverageManager.
///         Whitelist it via policy.setAllowedContract so it satisfies onlyProvaContract,
///         and route onPolicySet through it so it becomes the bound manager for judge().
///         Encrypted return values are stored so tests can assert their plaintext via
///         `hre.cofhe.mocks.expectPlaintext`.
contract PolicyHarness {
    /// @notice Last encrypted premium returned by evaluateRisk.
    euint64 public lastRisk;
    /// @notice Last encrypted claim verdict returned by judge.
    ebool public lastValid;

    function onPolicySet(
        TradeCreditInsurancePolicy policy,
        uint256 coverageId,
        bytes calldata data
    ) external {
        policy.onPolicySet(coverageId, data);
    }

    function evaluateRisk(TradeCreditInsurancePolicy policy, uint256 escrowId)
        external
        returns (euint64 risk)
    {
        risk = policy.evaluateRisk(escrowId, "");
        FHE.allowThis(risk);
        lastRisk = risk;
    }

    function judge(
        TradeCreditInsurancePolicy policy,
        uint256 coverageId,
        bytes calldata disputeProof
    ) external returns (ebool valid) {
        valid = policy.judge(coverageId, disputeProof);
        FHE.allowThis(valid);
        lastValid = valid;
    }
}
