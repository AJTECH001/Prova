// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IUnderwriterPolicy
/// @notice Interface for insurance policy plugins.
/// @dev Implement this to define risk evaluation and dispute resolution.
///      Return values are plain for testing (use FHE in production).
interface IUnderwriterPolicy {
  /// @notice Initialize policy-specific data for a new coverage.
  /// @param coverageId The coverage identifier.
  /// @param data ABI-encoded policy configuration.
  function onPolicySet(uint256 coverageId, bytes calldata data) external;

  /// @notice Evaluate risk and return risk score.
  /// @dev Score is in basis points (0-10000). 100 bps = 1% premium.
  /// @param escrowId The escrow being insured.
  /// @param riskProof Arbitrary proof data for risk evaluation.
  /// @return riskScore Risk score in basis points.
  function evaluateRisk(uint256 escrowId, bytes calldata riskProof) external returns (uint256 riskScore);

  /// @notice Judge a dispute and return verdict.
  /// @dev 
  /// @param coverageId The coverage being disputed.
  /// @param disputeProof Arbitrary proof data from the claimant.
  /// @return valid Boolean — true if the claim is legitimate.
  function judge(uint256 coverageId, bytes calldata disputeProof) external returns (bool valid);
}