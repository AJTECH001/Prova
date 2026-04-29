// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title TestnetCoreBase
/// @notice Base contract providing upgradeability and a centralised Moat registry
///         that prevents permission drift across all Prova registry contracts (P5).
abstract contract TestnetCoreBase is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    // ─── Moat registry (P5) ───────────────────────────────────────────────────

    error NotAProvaContract();

    /// @dev Centralised whitelist. Each deployed inheritor holds its own storage slot.
    ///      Storing here ensures every Prova registry uses the same gating pattern,
    ///      eliminating permission drift across registries.
    mapping(address => bool) internal _allowedContracts;

    /// @notice Reverts if msg.sender is not whitelisted in _allowedContracts.
    modifier onlyProvaContract() {
        if (!_allowedContracts[msg.sender]) revert NotAProvaContract();
        _;
    }

    /// @notice Returns true if addr is whitelisted in this contract's Moat registry.
    function isAllowedContract(address addr) external view returns (bool) {
        return _allowedContracts[addr];
    }

    // ─── Core init ────────────────────────────────────────────────────────────

    event CoreInitialized();

    function __TestnetCoreBase_init(address initialOwner) internal onlyInitializing {
        __Ownable_init(initialOwner);
        emit CoreInitialized();
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
