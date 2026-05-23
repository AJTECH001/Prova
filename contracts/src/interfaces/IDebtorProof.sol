 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  IDebtorProof
/// @notice Pluggable adapter interface that supplies a CoFHE-sealed encrypted credit score
///         for a given debtor identity (T1 — trusted score source).
///
/// @dev    Implementations MUST:
///         1. Validate and seal the plaintext score via cofheClient.encryptInputs() off-chain.
///         2. Store the resulting euint32 ciphertext handle on-chain via FHE.asEuint32().
///         3. Call FHE.allow(score, msg.sender) in getScore() so the calling policy
///            contract has ACL permission to use the encrypted value in FHE operations.
///
///         MockDebtorProof is restricted to local Hardhat (chainId 31337) and will revert
///         on any deployed network.  OracleDebtorProof is the production implementation.
interface IDebtorProof {

    /// @notice Return the latest CoFHE-sealed encrypted credit score for a debtor.
    /// @dev    Implementations must call FHE.allow(score, msg.sender) before returning
    ///         so that the calling policy contract can perform FHE operations on the score.
    ///         This function is NOT view — FHE.allow is a state-modifying call.
    /// @param  debtorId    Canonical debtor identifier (e.g. bytes32(uint160(walletAddress))).
    /// @return score       CoFHE-sealed encrypted uint32 credit score (0–1000 scale).
    /// @return timestamp   Block timestamp when the score was last attested.
    function getScore(bytes32 debtorId)
        external
        returns (euint32 score, uint256 timestamp);
}
