// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../interfaces/IUnderwriterPolicy.sol";
import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title MockUnderwriterPolicy
/// @notice Returns a fixed encrypted risk score. For testing only — requires CoFHE mock backend.
contract MockUnderwriterPolicy is IUnderwriterPolicy, ERC165 {
    uint64 public fixedRiskScoreBps;

    constructor(uint64 _fixedRiskScoreBps) {
        fixedRiskScoreBps = _fixedRiskScoreBps;
    }

    function onPolicySet(uint256, bytes calldata) external override {}

    /// @notice Returns fixedRiskScoreBps as an encrypted euint64.
    function evaluateRisk(uint256, bytes calldata) external override returns (euint64 riskScore) {
        riskScore = FHE.asEuint64(fixedRiskScoreBps);
        FHE.allowThis(riskScore);
        FHE.allow(riskScore, msg.sender);
    }

    /// @notice Always approves claims — for testing only.
    function judge(uint256, bytes calldata) external override returns (ebool valid) {
        valid = FHE.asEbool(true);
        FHE.allowThis(valid);
        FHE.allow(valid, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId || super.supportsInterface(interfaceId);
    }
}
