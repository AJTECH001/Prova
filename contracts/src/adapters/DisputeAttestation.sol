// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDisputeOracle} from "../interfaces/IDisputeOracle.sol";

/// @title  DisputeAttestation
/// @notice Pilot dispute-truth oracle. An authorized attestor (the PROVA backend, or
///         the owner) records whether the debt underlying a coverage is disputed.
///         `TradeCreditInsurancePolicy.judge` reads `isDisputed` to reject a claim on a
///         disputed debt — the insurable object is *undisputed* indebtedness.
///
/// @dev    KB-sanctioned interim path: "pilot — manual/centralized confirmation" before
///         zkTLS. Intentionally minimal and carries no FHE. A future oracle/zkTLS
///         implementation of `IDisputeOracle` is a drop-in replacement — no policy change.
///
///         Trust model: the attestor is a privileged, owner-managed role. The policy only
///         ever calls an owner-configured oracle address, never user-supplied.
contract DisputeAttestation is IDisputeOracle, Ownable {
    // ─── Errors ────────────────────────────────────────────────────────────────

    /// @dev Caller is neither the attestor nor the owner.
    error NotAuthorizedAttestor();

    /// @dev A zero address was supplied where a non-zero address is required.
    error ZeroAddress();

    // ─── Storage ───────────────────────────────────────────────────────────────

    /// @notice Address authorized to attest dispute status (the PROVA backend).
    address public attestor;

    /// @dev coverageId → whether the underlying debt is disputed.
    mapping(uint256 => bool) private _disputed;

    // ─── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when the authorized attestor address changes.
    /// @param  newAttestor The new attestor address.
    event AttestorUpdated(address indexed newAttestor);

    /// @notice Emitted when a dispute attestation is recorded or revoked.
    /// @param  coverageId The coverage whose underlying debt was attested.
    /// @param  disputed   The attested dispute state.
    event DisputeAttested(uint256 indexed coverageId, bool disputed);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyAttestor() {
        if (msg.sender != attestor && msg.sender != owner()) revert NotAuthorizedAttestor();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /// @param  initialOwner    Address that owns this contract (can rotate the attestor).
    /// @param  initialAttestor Address authorized to attest disputes (the backend wallet).
    constructor(address initialOwner, address initialAttestor) Ownable(initialOwner) {
        if (initialAttestor == address(0)) revert ZeroAddress();
        attestor = initialAttestor;
        emit AttestorUpdated(initialAttestor);
    }

    // ─── Owner administration ──────────────────────────────────────────────────

    /// @notice Rotate the authorized attestor.
    /// @param  newAttestor New attestor address. Must be non-zero.
    function setAttestor(address newAttestor) external onlyOwner {
        if (newAttestor == address(0)) revert ZeroAddress();
        attestor = newAttestor;
        emit AttestorUpdated(newAttestor);
    }

    // ─── Attestor operations ───────────────────────────────────────────────────

    /// @notice Record whether the debt underlying `coverageId` is disputed.
    /// @dev    Set `disputed = true` to exclude the claim (buyer contests the debt), or
    ///         `false` to clear a dispute / correct a prior attestation.
    /// @param  coverageId The coverage whose underlying debt is being attested.
    /// @param  disputed   True if the debt is disputed; false otherwise.
    function attestDispute(uint256 coverageId, bool disputed) external onlyAttestor {
        _disputed[coverageId] = disputed;
        emit DisputeAttested(coverageId, disputed);
    }

    // ─── IDisputeOracle ────────────────────────────────────────────────────────

    /// @inheritdoc IDisputeOracle
    function isDisputed(uint256 coverageId) external view override returns (bool) {
        return _disputed[coverageId];
    }
}
