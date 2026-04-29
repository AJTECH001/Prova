// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConditionResolverBase} from "../shared/extensions/ConditionResolverBase.sol";

/// @title  TradeInvoiceResolver
/// @notice Condition resolver implementing trade credit insurance protracted-default rules.
///
///         A claim triggers when the invoice due date plus a configurable waiting period
///         has elapsed without buyer payment. The resolver is purely time-based — party
///         identities are decoded for input validation and double-insurance detection
///         but are never stored on-chain.
///
/// @dev    Inherits caller-binding and ERC-165 from ConditionResolverBase.
contract TradeInvoiceResolver is ConditionResolverBase {

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Minimum waiting period for trade credit insurance (industry standard).
    uint256 public constant MIN_WAITING_PERIOD = 30 days;

    /// @notice Maximum waiting period for trade credit insurance (industry standard).
    uint256 public constant MAX_WAITING_PERIOD = 180 days;

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ConditionNotSet(uint256 escrowId);
    error InvalidBuyer();
    error InvalidSeller();
    error InvalidAmount();
    error InvalidDueDate();
    error InvalidWaitingPeriod();
    /// @dev Raised when the same invoice hash is already registered under another escrow.
    error InvoiceAlreadyRegistered(bytes32 invoiceHash);

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev Only time parameters are stored. Party identities and invoice amount
    ///      are validated then discarded to minimise on-chain data exposure.
    struct InvoiceCondition {
        uint256 dueDate;       // invoice payment due date (unix timestamp)
        uint256 waitingPeriod; // additional grace period after due date before claim opens
        bool    set;           // guard against uninitialised reads
    }

    /// @dev Private — escrow terms must not be world-readable.
    mapping(uint256 => InvoiceCondition) private _conditions;

    /// @dev Maps a canonical invoice hash to its escrow ID to prevent double-insurance.
    mapping(bytes32 => uint256) private _invoiceHashToEscrow;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a condition is registered for an escrow.
    /// @dev    Party addresses and invoice amount are intentionally omitted from the event.
    /// @param  escrowId The escrow for which the condition was registered.
    event ConditionSet(uint256 indexed escrowId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Initialize the resolver and assign ownership.
    /// @param  initialOwner Address that will own this contract.
    function initialize(address initialOwner) external initializer {
        __TestnetCoreBase_init(initialOwner);
    }

    // ─── IConditionResolver ──────────────────────────────────────────────────

    /// @notice Stores invoice time parameters and binds the calling escrow contract.
    /// @dev    data = abi.encode(address buyer, address seller, uint256 invoiceAmount,
    ///                           uint256 dueDate, uint256 waitingPeriod)
    ///         Party addresses and amount are used only for duplicate invoice detection
    ///         and are not retained in storage.
    /// @param  escrowId Unique identifier of the escrow being registered.
    /// @param  data     ABI-encoded invoice terms — buyer, seller, amount, dueDate, waitingPeriod.
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        // Binds the caller as the only authorised address for this escrowId.
        // Reverts ConditionAlreadySet if called a second time for the same escrowId.
        _bindEscrow(escrowId);

        (
            address buyer,
            address seller,
            uint256 invoiceAmount,
            uint256 dueDate,
            uint256 waitingPeriod
        ) = abi.decode(data, (address, address, uint256, uint256, uint256));

        if (buyer == address(0))                     revert InvalidBuyer();
        if (seller == address(0) || seller == buyer) revert InvalidSeller();
        if (invoiceAmount == 0)                      revert InvalidAmount();
        if (dueDate <= block.timestamp)              revert InvalidDueDate();
        if (waitingPeriod < MIN_WAITING_PERIOD ||
            waitingPeriod > MAX_WAITING_PERIOD)      revert InvalidWaitingPeriod();

        // Prevent the same invoice from being registered under two different escrows.
        // Using escrowId in hash prevents collision when same buyer/seller have multiple
        // invoices with identical amount and due date.
        bytes32 hash = _invoiceHash(escrowId, buyer, seller);
        if (_invoiceHashToEscrow[hash] != 0) revert InvoiceAlreadyRegistered(hash);
        _invoiceHashToEscrow[hash] = escrowId;

        // Only time parameters are persisted — party identities are not retained.
        _conditions[escrowId] = InvoiceCondition({
            dueDate:       dueDate,
            waitingPeriod: waitingPeriod,
            set:           true
        });

        emit ConditionSet(escrowId);
    }

    /// @notice Returns true when the invoice due date plus the waiting period has elapsed.
    /// @dev    Restricted to the bound escrow address to prevent external timing surveillance.
    /// @param  escrowId Unique identifier of the escrow to evaluate.
    /// @return          True if the protracted-default window has passed.
    function isConditionMet(uint256 escrowId)
        external
        view
        override
        onlyBoundEscrow(escrowId)
        returns (bool)
    {
        InvoiceCondition memory c = _conditions[escrowId];
        if (!c.set) return false;
        return block.timestamp >= c.dueDate + c.waitingPeriod;
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    /// @notice Produces a canonical hash to prevent duplicate escrow registrations.
    /// @dev    Uses escrowId to prevent hash collisions when the same buyer/seller pair
    ///         has multiple invoices. This is safer than hashing invoice terms alone.
    /// @param  escrowId Unique escrow identifier.
    /// @param  buyer    Buyer address.
    /// @param  seller   Seller address.
    /// @return          keccak256 hash uniquely identifying this escrow registration.
    function _invoiceHash(
        uint256 escrowId,
        address buyer,
        address seller
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(escrowId, buyer, seller));
    }
}
