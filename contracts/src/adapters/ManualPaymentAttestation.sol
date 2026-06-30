// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPaymentOracle} from "../interfaces/IPaymentOracle.sol";

/// @title  ManualPaymentAttestation
/// @notice Pilot payment-truth oracle. An authorized attestor (the PROVA backend, or
///         the owner) records whether the invoice underlying an escrow has been paid.
///         `TradeInvoiceResolver` reads `isPaid` to suppress a protracted-default claim
///         when the buyer actually paid off-chain.
///
/// @dev    This is the KB-sanctioned interim path: "pilot — manual/centralized
///         confirmation" before zkTLS. It is intentionally minimal and carries no FHE.
///         A future `ReclaimPaymentAttestation` (extending ReineiraOS
///         `ReclaimConditionBase`) implements the same `IPaymentOracle` interface and
///         is a drop-in replacement — no resolver change required.
///
///         Trust model: the attestor is a privileged, owner-managed role. The resolver
///         only ever calls an owner-configured oracle address, never user-supplied —
///         so this is not an untrusted external call from the resolver's perspective.
contract ManualPaymentAttestation is IPaymentOracle, Ownable {
    // ─── Errors ────────────────────────────────────────────────────────────────

    /// @dev Caller is neither the attestor nor the owner.
    error NotAuthorizedAttestor();

    /// @dev A zero address was supplied where a non-zero address is required.
    error ZeroAddress();

    // ─── Storage ───────────────────────────────────────────────────────────────

    /// @notice Address authorized to attest payment truth (the PROVA backend).
    address public attestor;

    /// @dev escrowId → whether the underlying invoice has been paid.
    mapping(uint256 => bool) private _paid;

    // ─── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when the authorized attestor address changes.
    /// @param  newAttestor The new attestor address.
    event AttestorUpdated(address indexed newAttestor);

    /// @notice Emitted when a payment attestation is recorded or revoked.
    /// @param  escrowId The escrow whose underlying invoice was attested.
    /// @param  paid     The attested payment state.
    event PaymentAttested(uint256 indexed escrowId, bool paid);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyAttestor() {
        if (msg.sender != attestor && msg.sender != owner()) revert NotAuthorizedAttestor();
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /// @param  initialOwner    Address that owns this contract (can rotate the attestor).
    /// @param  initialAttestor Address authorized to attest payment (the backend wallet).
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

    /// @notice Record whether the buyer has paid the invoice underlying `escrowId`.
    /// @dev    Set `paid = true` to suppress a protracted-default claim (buyer paid),
    ///         or `false` to reflect non-payment / correct a prior attestation.
    /// @param  escrowId The escrow whose underlying invoice is being attested.
    /// @param  paid     True if the buyer has paid; false otherwise.
    function attestPayment(uint256 escrowId, bool paid) external onlyAttestor {
        _paid[escrowId] = paid;
        emit PaymentAttested(escrowId, paid);
    }

    // ─── IPaymentOracle ────────────────────────────────────────────────────────

    /// @inheritdoc IPaymentOracle
    function isPaid(uint256 escrowId) external view override returns (bool) {
        return _paid[escrowId];
    }
}
