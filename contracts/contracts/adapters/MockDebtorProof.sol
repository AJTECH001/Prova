// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IDebtorProof} from "./IDebtorProof.sol";

/// @title  MockDebtorProof
/// @notice Test-only IDebtorProof adapter.
///
///         Returns a raw ABI-encoded InEuint32 struct.  This is NOT a valid CoFHE-sealed
///         ciphertext, so any call chain that reaches FHE.asEuint32(InEuint32) will revert
///         in local Hardhat (CoFHE precompile absent).  That is the expected test behavior —
///         see policy tests for the documented revert assertion.
///
///         On Fhenix testnet this contract must be replaced with a real oracle implementation
///         that seals the score via cofheClient.encryptInputs([Encryptable.uint32(score)]).
contract MockDebtorProof is IDebtorProof {

    /// @dev Default score returned for every debtorId unless overridden.
    uint256 private _defaultCtHash = 99999;

    /// @dev Per-debtor override.  0 means "use default".
    mapping(bytes32 => uint256) private _scoreOverrides;

    // ─── Owner control ────────────────────────────────────────────────────────

    /// @notice Set a per-debtor mock ct-hash (test utility).
    function setScore(bytes32 debtorId, uint256 ctHash) external {
        _scoreOverrides[debtorId] = ctHash;
    }

    /// @notice Set the default ct-hash returned for debtors without an override.
    function setDefaultScore(uint256 ctHash) external {
        _defaultCtHash = ctHash;
    }

    // ─── IDebtorProof ─────────────────────────────────────────────────────────

    /// @inheritdoc IDebtorProof
    function getScore(bytes32 debtorId)
        external
        view
        override
        returns (InEuint32 memory score, uint256 timestamp)
    {
        uint256 ctHash = _scoreOverrides[debtorId];
        if (ctHash == 0) ctHash = _defaultCtHash;

        // Construct a mock InEuint32 struct — not a valid CoFHE ciphertext.
        // uintType = 4 corresponds to euint32.
        score = InEuint32({ ctHash: ctHash, securityZone: 0, utype: 4, signature: "" });
        timestamp = block.timestamp;
    }
}
