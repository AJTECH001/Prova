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

    /// @dev Cumulative insured exposure per debtor per pool, stored as an encrypted euint64.
    ///      Keyed by debtor identifier and pool address to support multi-pool segregation.
    mapping(bytes32 => mapping(address => euint64)) private _exposure;

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Initialize the registry and assign ownership.
    /// @param  initialOwner Address that will own this contract.
    function initialize(address initialOwner) external initializer {
        __TestnetCoreBase_init(initialOwner);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Authorise a contract to call addExposure.
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
    ///         The concentration cap check is performed entirely within FHE — no
    ///         plaintext comparison of exposure values occurs on-chain.
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

        euint64 current = _exposure[debtorId][poolId];
        if (!Common.isInitialized(current)) {
            current = FHE.asEuint64(0);
        }

        euint64 candidate = FHE.add(current, amount);
        euint64 globalCap = FHE.asEuint64(globalCapPlain);
        ok = FHE.lte(candidate, globalCap);

        // Only update stored exposure if the cap is not breached.
        euint64 next = FHE.select(ok, candidate, current);
        _exposure[debtorId][poolId] = next;

        FHE.allowThis(next);
        FHE.allowTransient(ok, msg.sender);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns true if the given address is authorised to write exposure data.
    /// @param  addr Address to check.
    /// @return      True if the address is whitelisted.
    function isRegistered(address addr) external view returns (bool) {
        return _allowedContracts[addr];
    }
}
