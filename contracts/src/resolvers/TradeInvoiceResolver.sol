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
/// @dev    Inherits caller-binding, ERC-165, ERC-7201 storage, and ERC-2771 from
///         ConditionResolverBase and TestnetCoreBase.
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
    error InvalidFeeBps();
    /// @dev Raised when the same invoice hash is already registered under another escrow.
    error InvoiceAlreadyRegistered(bytes32 invoiceHash);

    // ─── ERC-7201 namespaced storage ─────────────────────────────────────────

    /// @dev Only time parameters are stored. Party identities and invoice amount
    ///      are validated then discarded to minimise on-chain data exposure.
    struct InvoiceCondition {
        uint256 dueDate;       // invoice payment due date (unix timestamp)
        uint256 waitingPeriod; // additional grace period after due date before claim opens
        bool    set;           // guard against uninitialised reads
    }

    struct ResolverStorage {
        /// @dev Private — escrow terms must not be world-readable.
        mapping(uint256 => InvoiceCondition) conditions;
        /// @dev Maps a canonical invoice hash to the first escrow that registered it,
        ///      preventing the same real-world invoice from being double-insured.
        mapping(bytes32 => uint256) invoiceHashToEscrow;
        /// @dev Sentinel for escrowId == 0: uint256 default (0) is a valid escrowId.
        mapping(bytes32 => bool) invoiceRegistered;
        /// @notice Authorised escrow contract permitted to register conditions.
        address escrowContract;
        /// @notice Condition fee charged at escrow creation (basis points, 100 = 1%).
        uint16 conditionFeeBps;
        /// @notice Address that receives the condition fee.
        address conditionFeeRecipient;
    }

    function _resolverStorage() private pure returns (ResolverStorage storage $) {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("reineira.storage.TradeInvoiceResolver")) - 1))
            & ~bytes32(uint256(0xff));
        assembly {
            $.slot := slot
        }
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a condition is registered for an escrow.
    /// @dev    Party addresses and invoice amount are intentionally omitted from the event.
    /// @param  escrowId The escrow for which the condition was registered.
    event ConditionSet(uint256 indexed escrowId);

    /// @notice Emitted when the authorised escrow contract is updated.
    /// @param  caller The new escrow contract address.
    event EscrowContractSet(address indexed caller);

    /// @notice Emitted when the condition fee parameters are updated.
    /// @param  bps       New fee in basis points.
    /// @param  recipient New fee recipient address.
    event ConditionFeeSet(uint16 bps, address indexed recipient);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialize the resolver and assign ownership.
    /// @param  initialOwner     Address that will own this contract.
    /// @param  _escrowContract  Address of the ConfidentialEscrow contract.
    /// @param  trustedForwarder ERC-2771 forwarder address (address(0) to disable).
    function initialize(
        address initialOwner,
        address _escrowContract,
        address trustedForwarder
    ) external initializer {
        __ConditionResolverBase_init(initialOwner, trustedForwarder);
        if (_escrowContract == address(0)) revert ZeroAddress();
        _resolverStorage().escrowContract = _escrowContract;
        emit EscrowContractSet(_escrowContract);
    }

    // ─── Owner administration ─────────────────────────────────────────────────

    /// @notice Update the authorised escrow contract.
    /// @param  _escrowContract Address of the new ConfidentialEscrow contract.
    function setEscrowContract(address _escrowContract) external onlyOwner {
        if (_escrowContract == address(0)) revert ZeroAddress();
        _resolverStorage().escrowContract = _escrowContract;
        emit EscrowContractSet(_escrowContract);
    }

    /// @notice Update the condition fee parameters.
    /// @param  bps       Fee in basis points (0 to disable, max 10000).
    /// @param  recipient Address that receives the fee (may be address(0) when bps == 0).
    function setConditionFee(uint16 bps, address recipient) external onlyOwner {
        if (bps > 10000) revert InvalidFeeBps();
        if (bps > 0 && recipient == address(0)) revert ZeroAddress();
        ResolverStorage storage $ = _resolverStorage();
        $.conditionFeeBps = bps;
        $.conditionFeeRecipient = recipient;
        emit ConditionFeeSet(bps, recipient);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns the authorised escrow contract address.
    function escrowContract() external view returns (address) {
        return _resolverStorage().escrowContract;
    }

    // ─── IConditionResolver ──────────────────────────────────────────────────

    /// @notice Stores invoice time parameters and binds the calling escrow contract.
    /// @dev    Restricted to escrowContract. Any other sender reverts with UnauthorizedCaller.
    ///         data = abi.encode(address buyer, address seller, uint256 invoiceAmount,
    ///                           uint256 dueDate, uint256 waitingPeriod)
    ///         Party addresses and amount are used only for duplicate invoice detection
    ///         and are not retained in storage.
    /// @param  escrowId Unique identifier of the escrow being registered.
    /// @param  data     ABI-encoded invoice terms — buyer, seller, amount, dueDate, waitingPeriod.
    function onConditionSet(uint256 escrowId, bytes calldata data) external override {
        ResolverStorage storage $ = _resolverStorage();
        if (msg.sender != $.escrowContract) revert UnauthorizedCaller(escrowId);
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
        // _invoiceRegistered is required because escrowId == 0 is a valid ID —
        // checking _invoiceHashToEscrow[hash] != 0 alone would silently fail for it.
        bytes32 hash = _invoiceHash(buyer, seller, invoiceAmount, dueDate);
        if ($.invoiceRegistered[hash]) revert InvoiceAlreadyRegistered(hash);
        $.invoiceRegistered[hash] = true;
        $.invoiceHashToEscrow[hash] = escrowId;

        // Only time parameters are persisted — party identities are not retained.
        $.conditions[escrowId] = InvoiceCondition({
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
        InvoiceCondition memory c = _resolverStorage().conditions[escrowId];
        if (!c.set) return false;
        return block.timestamp >= c.dueDate + c.waitingPeriod;
    }

    /// @notice Return the condition fee charged at escrow creation.
    /// @dev    RSS §5.5.1 — protocol stamps the Condition fee slot using this value during create().
    /// @return bps       Fee in basis points (100 = 1%).
    /// @return recipient Address that receives the condition fee.
    function getConditionFee() external view override returns (uint16 bps, address recipient) {
        ResolverStorage storage $ = _resolverStorage();
        return ($.conditionFeeBps, $.conditionFeeRecipient);
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    /// @notice Produces a canonical hash to detect duplicate invoice registrations.
    /// @param  buyer         Buyer address.
    /// @param  seller        Seller address.
    /// @param  invoiceAmount Invoice face value.
    /// @param  dueDate       Invoice due date (unix timestamp).
    /// @return               keccak256 hash uniquely identifying this invoice.
    function _invoiceHash(
        address buyer,
        address seller,
        uint256 invoiceAmount,
        uint256 dueDate
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(buyer, seller, invoiceAmount, dueDate));
    }

    // ─── Storage gap ──────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
