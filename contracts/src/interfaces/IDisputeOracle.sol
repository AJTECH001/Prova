// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IDisputeOracle
/// @notice Dispute-truth seam for trade-credit claim resolution.
///
///         The insurable object in trade credit is *undisputed* (bonafide) debt — a
///         claim on a disputed debt (buyer alleges goods/work were deficient) is
///         excluded. An implementation attests whether the debt underlying a coverage
///         is disputed, so the policy can reject the claim during `judge`.
///
/// @dev    Implementations:
///         - `DisputeAttestation` — pilot path; an authorized attestor records dispute
///           status (KB-sanctioned manual/centralized confirmation for pilots).
///         - (future) a zkTLS/oracle attestation of a dispute-resolution outcome,
///           drop-in via this same interface.
///
///         Consumed from `IUnderwriterPolicy.judge`. The policy only ever calls an
///         owner-configured implementation (never a user-supplied address).
interface IDisputeOracle {
    /// @notice True if the debt underlying `coverageId` is currently disputed.
    /// @param  coverageId The coverage whose underlying debt is being checked.
    /// @return disputed   True when a dispute has been attested for this coverage.
    function isDisputed(uint256 coverageId) external view returns (bool disputed);
}
