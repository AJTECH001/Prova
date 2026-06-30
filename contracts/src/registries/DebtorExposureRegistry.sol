// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreBase} from "../shared/CoreBase.sol";
import {FHE, Common, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  DebtorExposureRegistry
/// @notice Tracks cumulative insured exposure per debtor across all active PROVA policies.
///
///         All accumulated exposure is stored as encrypted euint64 values — never plaintext
///         on-chain. Concentration cap enforcement is performed entirely within FHE, returning
///         an encrypted boolean that callers use with FHE.select for branching.
///
///         The cap is enforced against the aggregate per-debtor total across all pools,
///         preventing bypass via pool-splitting. Per-pool analytics are reconstructed off-chain
///         by the backend from its own coverage records — no per-pool buckets are written on-chain
///         (they were never used for cap enforcement; removing the writes trims gas, FHE ops, and
///         attack surface). The deprecated bucket storage slot is retained for upgrade safety.
///
///         Write access is restricted to contracts whitelisted by the owner, preventing
///         unauthorised mutation of exposure state.
contract DebtorExposureRegistry is CoreBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    error NotRegisteredContract();

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a contract is authorised to write exposure data.
    /// @param  prova Address of the newly registered contract.
    event ContractRegistered(address indexed prova);

    /// @notice Emitted when a contract is removed from the writer whitelist.
    /// @param  prova Address of the deregistered contract.
    event ContractDeregistered(address indexed prova);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    struct ExposureStorage {
        /// @dev DEPRECATED (2026-06-30): former per-pool analytics buckets. No longer written or
        ///      read — per-pool analytics now live off-chain. The slot is RETAINED (not deleted)
        ///      so `exposureTotal` keeps its storage offset, preserving upgrade safety for the
        ///      already-deployed UUPS proxy. Do not reuse.
        mapping(bytes32 => mapping(address => euint64)) deprecatedExposureBuckets;
        /// @dev Aggregate per-debtor exposure total used for cap enforcement across all pools.
        ///      Enforcing caps on this aggregate prevents bypass via pool-splitting. This is the
        ///      ONLY exposure state kept on-chain.
        mapping(bytes32 => euint64) exposureTotal;
    }

    function _exposureStorage() private pure returns (ExposureStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.DebtorExposureRegistry")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the registry and assign ownership.
    /// @param  initialOwner     Address that will own this contract.
    /// @param  trustedForwarder ERC-2771 forwarder address (address(0) to disable).
    function initialize(address initialOwner, address trustedForwarder) external initializer {
        __CoreBase_init(initialOwner, trustedForwarder);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Authorise a contract to call addExposure and reduceExposure.
    /// @param  prova Address of the contract to whitelist.
    function registerContract(address prova) external onlyOwner {
        _setAllowedFlag(prova, true);
        emit ContractRegistered(prova);
    }

    /// @notice Remove a contract from the writer whitelist.
    /// @param  prova Address of the contract to deauthorise.
    function deregisterContract(address prova) external onlyOwner {
        _setAllowedFlag(prova, false);
        emit ContractDeregistered(prova);
    }

    // ─── Writer API ───────────────────────────────────────────────────────────

    /// @notice Record additional insured exposure for a debtor within a pool.
    ///         The concentration cap is enforced against the aggregate per-debtor total
    ///         across all pools — not just the individual pool bucket — preventing
    ///         bypass via pool-splitting. The cap check is performed entirely within FHE.
    /// @param  debtorId       Canonical debtor identifier.
    /// @dev    The second parameter (caller's pool context) is intentionally unused on-chain —
    ///         per-pool analytics are reconstructed off-chain. It is retained positionally for
    ///         ABI stability so existing callers (policy, harness, tests) need no change.
    /// @param  amount         Invoice amount as an encrypted euint64 handle.
    /// @param  globalCapPlain Plaintext maximum allowable exposure for this debtor.
    /// @return ok             Encrypted boolean — true if the new exposure is within cap.
    function addExposure(bytes32 debtorId, address /* poolId */, euint64 amount, uint64 globalCapPlain)
        external
        returns (ebool ok)
    {
        if (!_isAllowedContract(msg.sender)) revert NotRegisteredContract();

        ExposureStorage storage $ = _exposureStorage();

        // Cap enforcement uses the aggregate total across all pools.
        euint64 currentTotal = $.exposureTotal[debtorId];
        if (!Common.isInitialized(currentTotal)) {
            currentTotal = FHE.asEuint64(0);
        }

        euint64 candidate = FHE.add(currentTotal, amount);
        euint64 globalCap = FHE.asEuint64(globalCapPlain);
        ok = FHE.lte(candidate, globalCap);

        // Only update stored exposure if the cap is not breached.
        euint64 nextTotal = FHE.select(ok, candidate, currentTotal);
        $.exposureTotal[debtorId] = nextTotal;
        FHE.allowThis(nextTotal);

        FHE.allowTransient(ok, msg.sender);
    }

    /// @notice Reduce a debtor's aggregate exposure after a claim is settled.
    ///         Uses saturating subtraction — exposure never goes below zero.
    /// @param  debtorId Canonical debtor identifier.
    /// @param  amount   Encrypted amount to deduct from aggregate exposure.
    function reduceExposure(bytes32 debtorId, euint64 amount) external {
        if (!_isAllowedContract(msg.sender)) revert NotRegisteredContract();

        ExposureStorage storage $ = _exposureStorage();
        euint64 current = $.exposureTotal[debtorId];
        if (!Common.isInitialized(current)) return;

        // Saturating subtraction: clamp to zero rather than underflow.
        euint64 next = FHE.select(
            FHE.lte(amount, current),
            FHE.sub(current, amount),
            FHE.asEuint64(0)
        );
        $.exposureTotal[debtorId] = next;
        FHE.allowThis(next);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns true if the given address is authorised to write exposure data.
    /// @param  addr Address to check.
    /// @return      True if the address is whitelisted.
    function isRegistered(address addr) external view returns (bool) {
        return _isAllowedContract(addr);
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
