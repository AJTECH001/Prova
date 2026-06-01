// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IConditionResolver
/// @notice Interface for escrow release condition plugins.
/// @dev Implement this to control when a ConfidentialEscrow releases funds.
interface IConditionResolver {
  /// @notice Check if the release condition for an escrow is met.
  /// @dev Called on every redeem attempt. MUST be a view function.
  /// @param escrowId The sequential escrow identifier.
  /// @return True if the escrow should release funds.
  function isConditionMet(uint256 escrowId) external view returns (bool);

  /// @notice Initialize condition configuration for a new escrow.
  /// @dev Called atomically during ConfidentialEscrow.create().
  /// @param escrowId The sequential escrow identifier.
  /// @param data ABI-encoded configuration specific to this resolver.
  function onConditionSet(uint256 escrowId, bytes calldata data) external;

  /// @notice Return the condition fee charged at escrow creation.
  /// @dev RSS §5.5.1 — must be implemented by all IConditionResolver plugins.
  ///      Protocol uses this to stamp the Condition fee slot during create().
  /// @return bps       Fee in basis points (100 = 1%, max 10000).
  /// @return recipient Address that receives the condition fee.
  function getConditionFee() external view returns (uint16 bps, address recipient);
}
