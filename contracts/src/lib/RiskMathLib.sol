// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  RiskMathLib
/// @notice Default thresholds and premiums for the 6-bucket risk curve used by ProvaUnderwriterPolicy.
///         FHE evaluation runs in the policy contract; this library supplies the plaintext curve values.
///
///         ┌──────┬───────────┬─────────────┐
///         │Bucket│ Min score │ Premium bps │
///         ├──────┼───────────┼─────────────┤
///         │  0   │   800     │     150     │  1.50%
///         │  1   │   720     │     200     │  2.00%
///         │  2   │   650     │     280     │  2.80%
///         │  3   │   580     │     400     │  4.00%
///         │  4   │   500     │     600     │  6.00%
///         │  5   │     0     │    1000     │ 10.00% (floor)
///         └──────┴───────────┴─────────────┘
library RiskMathLib {

    /// @notice Bumped whenever the default curve shape changes.
    uint8 internal constant DEFAULT_CURVE_VERSION = 1;

    /// @notice Maximum add-on basis points allowed per country or industry risk factor.
    uint16 internal constant MAX_ADDON_BPS = 500; // 5%

    uint8 internal constant NUM_BUCKETS = 6;

    // ─── Default curve ────────────────────────────────────────────────────────

    /// @notice Plaintext score thresholds for each bucket, in descending order.
    function defaultThresholds() internal pure returns (uint32[6] memory t) {
        t[0] = 800;
        t[1] = 720;
        t[2] = 650;
        t[3] = 580;
        t[4] = 500;
        t[5] = 0;   // floor — selected when no higher threshold is met
    }

    /// @notice Plaintext premium rates (bps) corresponding to each bucket.
    function defaultPremiums() internal pure returns (uint32[6] memory p) {
        p[0] = 150;
        p[1] = 200;
        p[2] = 280;
        p[3] = 400;
        p[4] = 600;
        p[5] = 1000;
    }
}
