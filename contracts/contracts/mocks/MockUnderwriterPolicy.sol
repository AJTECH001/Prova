// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../interfaces/IUnderwriterPolicy.sol";

/// @title MockUnderwriterPolicy
/// @notice Returns a fixed risk score without FHE. For testing only.
contract MockUnderwriterPolicy is IUnderwriterPolicy, ERC165 {
    uint256 public fixedRiskScoreBps;

    constructor(uint256 _fixedRiskScoreBps) {
        fixedRiskScoreBps = _fixedRiskScoreBps;
    }

    function onPolicySet(uint256, bytes calldata) external override {}

    /// @notice Returns fixedRiskScoreBps directly — no FHE required.
    function evaluateRisk(uint256, bytes calldata) external view override returns (uint256) {
        return fixedRiskScoreBps;
    }

    /// @notice Always approves claims — for testing only.
    function judge(uint256, bytes calldata) external pure override returns (bool) {
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId || super.supportsInterface(interfaceId);
    }
}
