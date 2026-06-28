// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {DebtorExposureRegistry} from "../registries/DebtorExposureRegistry.sol";
import {InsuranceClaimsRegistry} from "../registries/InsuranceClaimsRegistry.sol";

/// @title  RegistryHarness
/// @notice Test-only harness. Stands in for a real PROVA policy contract so that
///         DebtorExposureRegistry / InsuranceClaimsRegistry FHE flows can be driven
///         in isolation: it converts an off-chain encrypted input into a euint64,
///         grants the registry ACL permission, performs the call, and exposes the
///         resulting encrypted handles for `expectPlaintext` assertions in tests.
/// @dev    Whitelist this contract via registerContract / registerPolicy before use.
contract RegistryHarness {
    /// @notice Last encrypted "within cap" flag returned by addExposure.
    ebool public lastOk;

    /// @notice Convert + authorise an encrypted amount, then record exposure.
    function addExposure(
        DebtorExposureRegistry reg,
        bytes32 debtorId,
        address poolId,
        InEuint64 calldata amount,
        uint64 globalCapPlain
    ) external returns (ebool ok) {
        euint64 a = _prepare(amount, address(reg));
        ok = reg.addExposure(debtorId, poolId, a, globalCapPlain);
        FHE.allowThis(ok);
        lastOk = ok;
    }

    /// @notice Convert + authorise an encrypted amount, then reduce exposure.
    function reduceExposure(
        DebtorExposureRegistry reg,
        bytes32 debtorId,
        InEuint64 calldata amount
    ) external {
        euint64 a = _prepare(amount, address(reg));
        reg.reduceExposure(debtorId, a);
    }

    /// @notice Convert + authorise an encrypted amount, then append a claim entry.
    function logClaim(
        InsuranceClaimsRegistry reg,
        uint256 coverageId,
        uint32 version,
        InEuint64 calldata amount
    ) external {
        euint64 a = _prepare(amount, address(reg));
        reg.logClaim(coverageId, version, a);
    }

    function _prepare(InEuint64 calldata amount, address registry) private returns (euint64 a) {
        a = FHE.asEuint64(amount);
        FHE.allowThis(a);
        FHE.allow(a, registry);
    }
}
