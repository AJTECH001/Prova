// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../../interfaces/IUnderwriterPolicy.sol";
import {TestnetCoreBase} from "../TestnetCoreBase.sol";

/// @title  UnderwriterPolicyBase
/// @notice Abstract base for IUnderwriterPolicy implementations.
///         Provides:
///           - Caller binding (T4): first caller of `onPolicySet` is bound per coverageId.
///           - Ownable: owner can update curve parameters and risk tables (R6).
abstract contract UnderwriterPolicyBase is IUnderwriterPolicy, ERC165, TestnetCoreBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @dev Caller is not the coverage manager that registered this coverageId.
    error UnauthorizedCaller(uint256 coverageId);

    /// @dev onPolicySet already called for this coverageId.
    error PolicyAlreadySet(uint256 coverageId);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev Private — binding must not be world-readable (T4).
    mapping(uint256 => address) private _boundManager;

    // ─── Modifiers ───────────────────────────────────────────────────────────

    /// @dev Restricts a function to the coverage manager that registered this coverageId.
    modifier onlyBoundManager(uint256 coverageId) {
        if (msg.sender != _boundManager[coverageId]) revert UnauthorizedCaller(coverageId);
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Initialize the upgradeable policy base.
    function __UnderwriterPolicyBase_init(address initialOwner) internal onlyInitializing {
        __TestnetCoreBase_init(initialOwner);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @notice Bind msg.sender as the only authorised manager for `coverageId`.
    /// @dev    Call this once at the start of `onPolicySet`.
    function _bindManager(uint256 coverageId) internal {
        if (_boundManager[coverageId] != address(0)) revert PolicyAlreadySet(coverageId);
        _boundManager[coverageId] = msg.sender;
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId
            || super.supportsInterface(interfaceId);
    }
}
