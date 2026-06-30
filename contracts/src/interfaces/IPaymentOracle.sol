// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IPaymentOracle
/// @notice Payment-truth seam for trade-credit claim resolution.
///
///         A protracted-default claim must open only when the buyer has actually
///         failed to pay — not merely because a deadline elapsed. An implementation
///         of this interface attests whether the invoice underlying an escrow has
///         been paid, so the resolver can suppress a claim when payment is proven.
///
/// @dev    Implementations:
///         - `ManualPaymentAttestation` — pilot path; an authorized attestor records
///           payment off-chain truth on-chain (KB-sanctioned for pilots).
///         - (future) a Reclaim zkTLS attestation extending ReineiraOS
///           `ReclaimConditionBase`, drop-in via this same interface once that
///           package/verifier is available on the target network.
///
///         Consumed from `IConditionResolver.isConditionMet`, so it MUST be `view`
///         and cheap. The resolver only ever calls an owner-configured implementation
///         (never a user-supplied address).
interface IPaymentOracle {
    /// @notice True if the invoice underlying `escrowId` is known to be paid.
    /// @param  escrowId The escrow whose underlying invoice is being checked.
    /// @return paid     True when payment has been attested for this escrow.
    function isPaid(uint256 escrowId) external view returns (bool paid);
}
