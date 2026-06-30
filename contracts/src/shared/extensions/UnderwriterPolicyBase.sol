// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IUnderwriterPolicy} from "../../interfaces/IUnderwriterPolicy.sol";
import {CoreBase} from "../CoreBase.sol";

/// @title  UnderwriterPolicyBase
/// @notice Abstract base for IUnderwriterPolicy implementations.
///         Provides:
///           - Caller binding (T4): first caller of `onPolicySet` is bound per coverageId.
///           - Ownable: owner can update curve parameters and risk tables (R6).
abstract contract UnderwriterPolicyBase is IUnderwriterPolicy, ERC165, CoreBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    error UnauthorizedCaller(uint256 coverageId);
    error PolicyAlreadySet(uint256 coverageId);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    struct PolicyBaseStorage {
        mapping(uint256 => address) boundManager;
    }

    function _policyBaseStorage() private pure returns (PolicyBaseStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.UnderwriterPolicyBase")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────

    /// @dev Restricts a function to the coverage manager that registered this coverageId.
    ///      Uses msg.sender directly — the coverage manager contract (not the end-user) is the caller.
    modifier onlyBoundManager(uint256 coverageId) {
        if (msg.sender != _policyBaseStorage().boundManager[coverageId]) revert UnauthorizedCaller(coverageId);
        _;
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    /// @notice Initialize the upgradeable policy base.
    /// @param initialOwner    Address granted ownership.
    /// @param trustedForwarder ERC-2771 forwarder address (address(0) to disable).
    function __UnderwriterPolicyBase_init(
        address initialOwner,
        address trustedForwarder
    ) internal onlyInitializing {
        __CoreBase_init(initialOwner, trustedForwarder);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @notice Bind msg.sender (the coverage manager) as the only authorised caller for `coverageId`.
    /// @dev    Call this once at the start of `onPolicySet`.
    function _bindManager(uint256 coverageId) internal {
        PolicyBaseStorage storage $ = _policyBaseStorage();
        if ($.boundManager[coverageId] != address(0)) revert PolicyAlreadySet(coverageId);
        $.boundManager[coverageId] = msg.sender;
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return interfaceId == type(IUnderwriterPolicy).interfaceId
            || super.supportsInterface(interfaceId);
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
