 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title  IDebtorProof
/// @notice Pluggable adapter interface that supplies an encrypted FICO-style credit score
///         for a given debtor identity (T1 — trusted score source).
///
/// @dev    On Fhenix testnet the implementation seals the score via cofheClient and returns
///         a valid CoFHE-encrypted InEuint32.  On local Hardhat, MockDebtorProof is used for
///         structural testing (FHE.asEuint32 will still revert — that is the expected behavior).
interface IDebtorProof {

    /// @notice Return the latest encrypted credit score for a debtor.
    /// @param  debtorId    Canonical debtor identifier (e.g. keccak256 of off-chain entity ID).
    /// @return score       CoFHE-sealed encrypted uint32 credit score (0–1000 scale).
    /// @return timestamp   Block timestamp when the score was last attested.
    function getScore(bytes32 debtorId)
        external
        returns (InEuint32 memory score, uint256 timestamp);
}
