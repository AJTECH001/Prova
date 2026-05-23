// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, Common, euint32, InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {IDebtorProof} from "../interfaces/IDebtorProof.sol";

/// @title  MockDebtorProof
/// @notice Test-only IDebtorProof adapter. STRICTLY RESTRICTED TO LOCAL HARDHAT (chainId 31337).
///
///         Any call on a deployed network (Arbitrum Sepolia, mainnet, etc.) reverts immediately
///         with MockAdapterOnLiveNetwork. This is an invariant — do not remove the guard.
///
///         On Hardhat, the cofhe mock-contracts plugin simulates FHE operations so that
///         FHE.asEuint32(InEuint32{ctHash: n}) succeeds and returns a valid test handle.
///         Tests must call hre.cofhe.initializeWithHardhatSigner(signer) before using this.
///
/// @dev    For per-test score overrides call setScore(debtorId, ctHash) before exercising
///         evaluateRisk. The ctHash must be registered in the mock CoFHE state — use the
///         ctHash returned by cofheClient.encryptInputs in tests.
contract MockDebtorProof is IDebtorProof {

    // ─── Constants ────────────────────────────────────────────────────────────

    uint8  private constant EUINT32_UTYPE = 4;
    uint32 private constant HARDHAT_CHAIN_ID = 31337;

    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @dev Thrown when called on any network other than local Hardhat.
    ///      Root cause: MockDebtorProof is still wired as the debtorProofAdapter.
    ///      Fix: deploy OracleDebtorProof and call policy.setDebtorProofAdapter(oracleAddress).
    error MockAdapterOnLiveNetwork(uint256 chainId);

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev Default score ctHash returned for every debtorId unless overridden.
    ///      Must be registered in the mock CoFHE state before use in tests.
    uint256 private _defaultCtHash = 99999;

    /// @dev Per-debtor override. 0 means "use default".
    mapping(bytes32 => uint256) private _scoreOverrides;

    // ─── Test utilities ───────────────────────────────────────────────────────

    /// @notice Set a per-debtor mock ctHash for test isolation.
    /// @dev    Use the ctHash from cofheClient.encryptInputs([Encryptable.uint32(score)]) in tests.
    function setScore(bytes32 debtorId, uint256 ctHash) external {
        _scoreOverrides[debtorId] = ctHash;
    }

    /// @notice Set the default ctHash returned for debtors without an override.
    function setDefaultScore(uint256 ctHash) external {
        _defaultCtHash = ctHash;
    }

    // ─── IDebtorProof ─────────────────────────────────────────────────────────

    /// @inheritdoc IDebtorProof
    /// @dev    PRODUCTION GUARD: reverts on any non-Hardhat network.
    ///         On Hardhat (chainId 31337), the cofhe mock-contracts plugin handles
    ///         FHE.asEuint32 without a real CoFHE network connection.
    function getScore(bytes32 debtorId)
        external
        override
        returns (euint32 score, uint256 timestamp)
    {
        if (block.chainid != HARDHAT_CHAIN_ID)
            revert MockAdapterOnLiveNetwork(block.chainid);

        uint256 ctHash = _scoreOverrides[debtorId];
        if (ctHash == 0) ctHash = _defaultCtHash;

        // On Hardhat with mock CoFHE, FHE.asEuint32 calls the mock TaskManager which
        // accepts any ctHash registered in the mock state. Tests must use valid mock ctHashes.
        InEuint32 memory mockInput = InEuint32({
            ctHash:       ctHash,
            securityZone: 0,
            utype:        EUINT32_UTYPE,
            signature:    ""
        });
        score = FHE.asEuint32(mockInput);
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);

        timestamp = block.timestamp;
    }
}
