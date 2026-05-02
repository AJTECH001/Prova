// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TestnetCoreBase} from "../shared/TestnetCoreBase.sol";
import {FHE, Common, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  DebtorExposureRegistry
/// @notice Tracks cumulative insured exposure per debtor across all active PROVA policies.
///
///         All accumulated exposure is stored as encrypted euint64 values — never plaintext
///         on-chain. Concentration cap enforcement is performed entirely within FHE, returning
///         an encrypted boolean that callers use with FHE.select for branching.
///
///         The cap is enforced against the aggregate per-debtor total across all pools,
///         preventing bypass via pool-splitting. Per-pool buckets are maintained for analytics.
///
///         Write access is restricted to contracts whitelisted by the owner, preventing
///         unauthorised mutation of exposure state.
contract DebtorExposureRegistry is TestnetCoreBase {

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @dev Raised when a caller is not in the owner-managed whitelist.
    error NotRegisteredContract();

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a contract is authorised to write exposure data.
    /// @param  prova Address of the newly registered contract.
    event ContractRegistered(address indexed prova);

    /// @notice Emitted when a contract is removed from the writer whitelist.
    /// @param  prova Address of the deregistered contract.
    event ContractDeregistered(address indexed prova);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev Per-pool exposure buckets for analytics segregation (keyed by debtor + pool).
    ///      Not used for cap enforcement — see _exposureTotal.
    mapping(bytes32 => mapping(address => euint64)) private _exposure;

    /// @dev Aggregate per-debtor exposure total used for cap enforcement across all pools.
    ///      Enforcing caps on this aggregate prevents bypass via pool-splitting.
    mapping(bytes32 => euint64) private _exposureTotal;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the registry and assign ownership.
    /// @param  initialOwner Address that will own this contract.
    function initialize(address initialOwner) external initializer {
        __TestnetCoreBase_init(initialOwner);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Authorise a contract to call addExposure and reduceExposure.
    /// @param  prova Address of the contract to whitelist.
    function registerContract(address prova) external onlyOwner {
        _allowedContracts[prova] = true;
        emit ContractRegistered(prova);
    }

    /// @notice Remove a contract from the writer whitelist.
    /// @param  prova Address of the contract to deauthorise.
    function deregisterContract(address prova) external onlyOwner {
        _allowedContracts[prova] = false;
        emit ContractDeregistered(prova);
    }

    // ─── Writer API ───────────────────────────────────────────────────────────

    /// @notice Record additional insured exposure for a debtor within a pool.
    ///         The concentration cap is enforced against the aggregate per-debtor total
    ///         across all pools — not just the individual pool bucket — preventing
    ///         bypass via pool-splitting. The cap check is performed entirely within FHE.
    /// @param  debtorId       Canonical debtor identifier.
    /// @param  poolId         Pool address used to segregate exposure per currency pool.
    /// @param  amount         Invoice amount as an encrypted euint64 handle.
    /// @param  globalCapPlain Plaintext maximum allowable exposure for this debtor.
    /// @return ok             Encrypted boolean — true if the new exposure is within cap.
    function addExposure(bytes32 debtorId, address poolId, euint64 amount, uint64 globalCapPlain)
        external
        returns (ebool ok)
    {
        if (!_allowedContracts[msg.sender]) revert NotRegisteredContract();

        // Cap enforcement uses the aggregate total across all pools.
        euint64 currentTotal = _exposureTotal[debtorId];
        if (!Common.isInitialized(currentTotal)) {
            currentTotal = FHE.asEuint64(0);
        }

        euint64 candidate = FHE.add(currentTotal, amount);
        euint64 globalCap = FHE.asEuint64(globalCapPlain);
        ok = FHE.lte(candidate, globalCap);

        // Only update stored exposure if the cap is not breached.
        euint64 nextTotal = FHE.select(ok, candidate, currentTotal);
        _exposureTotal[debtorId] = nextTotal;
        FHE.allowThis(nextTotal);

        // Maintain per-pool bucket for analytics (updated only when cap passes).
        euint64 currentPool = _exposure[debtorId][poolId];
        if (!Common.isInitialized(currentPool)) {
            currentPool = FHE.asEuint64(0);
        }
        euint64 nextPool = FHE.select(ok, FHE.add(currentPool, amount), currentPool);
        _exposure[debtorId][poolId] = nextPool;
        FHE.allowThis(nextPool);

        FHE.allowTransient(ok, msg.sender);
    }

    /// @notice Reduce a debtor's aggregate exposure after a claim is settled.
    ///         Uses saturating subtraction — exposure never goes below zero.
    /// @param  debtorId Canonical debtor identifier.
    /// @param  amount   Encrypted amount to deduct from aggregate exposure.
    function reduceExposure(bytes32 debtorId, euint64 amount) external {
        if (!_allowedContracts[msg.sender]) revert NotRegisteredContract();

        euint64 current = _exposureTotal[debtorId];
        if (!Common.isInitialized(current)) return;

        // Saturating subtraction: clamp to zero rather than underflow.
        euint64 next = FHE.select(
            FHE.lte(amount, current),
            FHE.sub(current, amount),
            FHE.asEuint64(0)
        );
        _exposureTotal[debtorId] = next;
        FHE.allowThis(next);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns true if the given address is authorised to write exposure data.
    /// @param  addr Address to check.
    /// @return      True if the address is whitelisted.
    function isRegistered(address addr) external view returns (bool) {
        return _allowedContracts[addr];
    }
}
