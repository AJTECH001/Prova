// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @title CoreBase
/// @notice Base contract providing upgradeability, ERC-7201 namespaced storage, ERC-2771
///         meta-transaction support, and a centralised Moat registry for all Prova plugins.
/// @dev    Ownership uses the two-step (`Ownable2Step`) handover: `transferOwnership` only
///         nominates a pending owner; the nominee must call `acceptOwnership` to take control.
///         This prevents a fat-fingered transfer from permanently bricking every owner-gated
///         config and the UUPS upgrade authority — a production-grade safeguard given how
///         much authority `onlyOwner` concentrates across the Prova plugin set.
abstract contract CoreBase is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    PausableUpgradeable
{

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    struct CoreStorage {
        mapping(address => bool) allowedContracts;
        address trustedForwarder;
    }

    function _coreStorage() private pure returns (CoreStorage storage $) {
        // NOTE: the storage-namespace string is intentionally kept as the original
        // "TestnetCoreBase" literal after the contract was renamed to CoreBase, so the
        // ERC-7201 slot is unchanged and already-deployed UUPS proxies upgrade safely.
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.TestnetCoreBase")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Internal helpers for derived contracts ───────────────────────────────

    function _isAllowedContract(address addr) internal view returns (bool) {
        return _coreStorage().allowedContracts[addr];
    }

    function _setAllowedFlag(address addr, bool val) internal {
        _coreStorage().allowedContracts[addr] = val;
    }

    // ─── Moat registry ────────────────────────────────────────────────────────

    error NotAProvaContract();
    error ZeroAddress();

    event CoreInitialized();
    event ContractWhitelistUpdated(address indexed addr, bool allowed);
    event TrustedForwarderSet(address indexed forwarder);

    /// @notice Reverts if the effective sender is not whitelisted.
    modifier onlyProvaContract() {
        if (!_coreStorage().allowedContracts[_msgSender()]) revert NotAProvaContract();
        _;
    }

    /// @notice Returns true if addr is whitelisted in this contract's Moat registry.
    function isAllowedContract(address addr) external view returns (bool) {
        return _coreStorage().allowedContracts[addr];
    }

    /// @notice Update the Moat registry whitelist.
    /// @param addr    Address to whitelist or remove.
    /// @param allowed True to whitelist, false to remove.
    function setAllowedContract(address addr, bool allowed) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();
        _coreStorage().allowedContracts[addr] = allowed;
        emit ContractWhitelistUpdated(addr, allowed);
    }

    // ─── ERC-2771 meta-transactions ───────────────────────────────────────────

    /// @notice Returns true if forwarder is the trusted forwarder for this contract.
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _coreStorage().trustedForwarder;
    }

    /// @notice Update the trusted forwarder address. Only callable by owner.
    function setTrustedForwarder(address forwarder) external onlyOwner {
        _coreStorage().trustedForwarder = forwarder;
        emit TrustedForwarderSet(forwarder);
    }

    /// @dev ERC-2771: recover original signer from trailing 20 bytes appended by forwarder.
    function _msgSender() internal view virtual override returns (address sender) {
        if (msg.sender == _coreStorage().trustedForwarder && msg.data.length >= 20) {
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    /// @dev ERC-2771: strip trailing 20 forwarder bytes from calldata.
    function _msgData() internal view virtual override returns (bytes calldata) {
        if (msg.sender == _coreStorage().trustedForwarder && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        }
        return msg.data;
    }

    // ─── Core init ────────────────────────────────────────────────────────────

    function __CoreBase_init(
        address initialOwner,
        address trustedForwarder
    ) internal onlyInitializing {
        __Ownable_init(initialOwner);
        __Pausable_init();
        _coreStorage().trustedForwarder = trustedForwarder;
        emit CoreInitialized();
    }

    // ─── Emergency stop (new-business only) ───────────────────────────────────

    /// @notice Emergency stop affecting NEW business only. While paused, new coverage /
    ///         condition registration and risk pricing revert (`whenNotPaused` entrypoints).
    ///         Claim resolution (`judge` / `isConditionMet`) is intentionally NOT gated, so a
    ///         pause can never trap a pending claim or a buyer's refund.
    /// @dev    Owner-gated. A dedicated PAUSER role is a possible future refinement.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Lift the emergency stop.
    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
