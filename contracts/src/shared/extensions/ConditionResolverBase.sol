// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IConditionResolver} from "../../interfaces/IConditionResolver.sol";
import {TestnetCoreBase} from "../TestnetCoreBase.sol";

/// @title  ConditionResolverBase
/// @notice Abstract base for IConditionResolver implementations.
///         Provides caller-binding (T4): the first address that calls `onConditionSet`
///         for a given escrowId is bound as the only authorised caller for that id.
///         Inheriting contracts call `_bindEscrow` once, then use `onlyBoundEscrow`.
abstract contract ConditionResolverBase is IConditionResolver, ERC165, TestnetCoreBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @dev Caller is not the escrow that registered this escrowId.
    error UnauthorizedCaller(uint256 escrowId);

    /// @dev onConditionSet already called for this escrowId.
    error ConditionAlreadySet(uint256 escrowId);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev Private — binding must not be world-readable.
    mapping(uint256 => address) private _boundEscrow;

    // ─── Modifiers ───────────────────────────────────────────────────────────

    /// @dev Restricts a function to the escrow contract that registered this escrowId.
    modifier onlyBoundEscrow(uint256 escrowId) {
        if (msg.sender != _boundEscrow[escrowId]) revert UnauthorizedCaller(escrowId);
        _;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @notice Bind msg.sender as the only authorised caller for `escrowId`.
    /// @dev    Call this once at the start of `onConditionSet`.
    function _bindEscrow(uint256 escrowId) internal {
        if (_boundEscrow[escrowId] != address(0)) revert ConditionAlreadySet(escrowId);
        _boundEscrow[escrowId] = msg.sender;
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return interfaceId == type(IConditionResolver).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
