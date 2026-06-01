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

    error UnauthorizedCaller(uint256 escrowId);
    error ConditionAlreadySet(uint256 escrowId);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    struct ResolverBaseStorage {
        mapping(uint256 => address) boundEscrow;
    }

    function _resolverBaseStorage() private pure returns (ResolverBaseStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.ConditionResolverBase")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────

    /// @dev Restricts a function to the escrow contract that registered this escrowId.
    ///      Uses msg.sender directly — the escrow contract (not the end-user) is the caller.
    modifier onlyBoundEscrow(uint256 escrowId) {
        if (msg.sender != _resolverBaseStorage().boundEscrow[escrowId]) revert UnauthorizedCaller(escrowId);
        _;
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    function __ConditionResolverBase_init(
        address initialOwner,
        address trustedForwarder
    ) internal onlyInitializing {
        __TestnetCoreBase_init(initialOwner, trustedForwarder);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @notice Bind msg.sender (the escrow) as the only authorised caller for `escrowId`.
    /// @dev    Call this once at the start of `onConditionSet`.
    function _bindEscrow(uint256 escrowId) internal {
        ResolverBaseStorage storage $ = _resolverBaseStorage();
        if ($.boundEscrow[escrowId] != address(0)) revert ConditionAlreadySet(escrowId);
        $.boundEscrow[escrowId] = msg.sender;
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return interfaceId == type(IConditionResolver).interfaceId
            || super.supportsInterface(interfaceId);
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
