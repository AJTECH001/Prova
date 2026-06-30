import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  encodeAbiParameters,
  parseAbiParameters,
  zeroAddress,
  keccak256,
  toHex,
} from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';
import { encryptUint32, encryptUint64, ethersSigners, type InEuint64 } from '../helpers/cofhe';

const DEBTOR = keccak256(toHex('debtor-buyer-co'));
const POOL = '0x00000000000000000000000000000000000000a1';
const COUNTRY = '0x4e47'; // "NG"
const INDUSTRY = '0x01020304';
const CREDIT_LIMIT = 50_000n;
const INVOICE = 10_000n;
const COVERAGE_BPS = 9000; // 90%
const CAP = 1_000_000n;

const COVERAGE_ID = 1n;
const ESCROW_ID = 1001n;

// Default curve: thresholds [800,720,650,580,500,0] -> premiums [150,200,280,400,600,1000] bps.
const POLICY_PARAMS = parseAbiParameters(
  'bytes32 debtorId, address poolId, uint64 creditLimit, uint16 coverageBps, bytes2 country, bytes4 industry, uint64 invoice, uint256 escrowId',
);
const IN_EUINT64 = parseAbiParameters(
  '(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature)',
);

function encodePolicyData(overrides: Partial<{
  debtorId: `0x${string}`;
  creditLimit: bigint;
  coverageBps: number;
  invoice: bigint;
  escrowId: bigint;
}> = {}): `0x${string}` {
  return encodeAbiParameters(POLICY_PARAMS, [
    overrides.debtorId ?? DEBTOR,
    POOL,
    overrides.creditLimit ?? CREDIT_LIMIT,
    overrides.coverageBps ?? COVERAGE_BPS,
    COUNTRY,
    INDUSTRY,
    overrides.invoice ?? INVOICE,
    overrides.escrowId ?? ESCROW_ID,
  ]);
}

function encodeDisputeProof(enc: InEuint64): `0x${string}` {
  return encodeAbiParameters(IN_EUINT64, [
    { ctHash: enc.ctHash, securityZone: enc.securityZone, utype: enc.utype, signature: enc.signature },
  ]);
}

describe('TradeCreditInsurancePolicy', () => {
  async function deployFixture() {
    const [owner, oracleEoa] = await hre.viem.getWalletClients();

    const exposureRegistry = await deployBehindProxy('DebtorExposureRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const lossHistory = await deployBehindProxy('InsuranceClaimsRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const oracle = await hre.viem.deployContract('OracleDebtorProof', [
      owner.account.address,
      oracleEoa.account.address,
    ]);
    const policy = await deployBehindProxy('TradeCreditInsurancePolicy', 'initialize', [
      owner.account.address,
      oracle.address,
      exposureRegistry.address,
      lossHistory.address,
      zeroAddress,
    ]);

    // Wire the registries to accept writes from the policy.
    await exposureRegistry.write.registerContract([policy.address]);
    await lossHistory.write.registerPolicy([policy.address]);

    // The harness stands in for the coverage manager (whitelisted Prova contract).
    const harness = await hre.viem.deployContract('PolicyHarness');
    await policy.write.setAllowedContract([harness.address, true]);

    // Concentration cap is required before any coverage can be registered.
    await policy.write.setConcentrationCap([DEBTOR, CAP]);

    const signers = await ethersSigners();
    const setScore = async (debtorId: `0x${string}`, score: number) => {
      const enc = await encryptUint32(signers[0], score);
      await oracle.write.setScore([debtorId, enc]);
    };

    // Register coverage for the default debtor/escrow via the harness.
    const setUpCoverage = async (score: number, dataOverrides = {}) => {
      await setScore(DEBTOR, score);
      await harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData(dataOverrides)]);
    };

    return { policy, exposureRegistry, lossHistory, oracle, harness, owner, signers, setScore, setUpCoverage };
  }

  describe('onPolicySet — validation', () => {
    it('reverts on a zero credit limit', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData({ creditLimit: 0n })]),
        'InvalidCreditLimit',
      );
    });

    it('reverts on a zero coverage percentage', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData({ coverageBps: 0 })]),
        'InvalidCoveragePercentage',
      );
    });

    it('reverts on a coverage percentage above 100%', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData({ coverageBps: 10_001 })]),
        'InvalidCoveragePercentage',
      );
    });

    it('reverts on a zero invoice amount', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData({ invoice: 0n })]),
        'InvalidInvoiceAmount',
      );
    });

    it('reverts when no concentration cap is set for the debtor', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      const unknownDebtor = keccak256(toHex('debtor-no-cap'));
      await expectRevert(
        harness.write.onPolicySet([
          policy.address,
          COVERAGE_ID,
          encodePolicyData({ debtorId: unknownDebtor }),
        ]),
        'ConcentrationCapNotSet(bytes32)',
      );
    });

    it('reverts when the coverage manager is not whitelisted', async () => {
      const { policy } = await loadFixture(deployFixture);
      await expectRevert(
        policy.write.onPolicySet([COVERAGE_ID, encodePolicyData()]),
        'NotAProvaContract()',
      );
    });
  });

  describe('onPolicySet — binding', () => {
    it('binds the manager and rejects a second registration of the same coverageId', async () => {
      const { policy, harness, setScore } = await loadFixture(deployFixture);
      await setScore(DEBTOR, 800);
      await harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData()]);
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData({ invoice: 5_000n })]),
        'PolicyAlreadySet(uint256)',
      );
    });
  });

  describe('owner administration', () => {
    it('rejects a non-descending curve', async () => {
      const { policy } = await loadFixture(deployFixture);
      await expectRevert(
        policy.write.setCurve([
          [800, 800, 650, 580, 500, 0],
          [150, 200, 280, 400, 600, 1000],
        ]),
        'InvalidCurve',
      );
    });

    it('rejects a curve whose floor threshold is non-zero', async () => {
      const { policy } = await loadFixture(deployFixture);
      await expectRevert(
        policy.write.setCurve([
          [800, 720, 650, 580, 500, 1],
          [150, 200, 280, 400, 600, 1000],
        ]),
        'InvalidCurve',
      );
    });

    it('accepts a valid curve and bumps the version', async () => {
      const { policy } = await loadFixture(deployFixture);
      const before = await policy.read.curveVersion();
      await policy.write.setCurve([
        [820, 740, 660, 590, 510, 0],
        [120, 180, 260, 380, 580, 990],
      ]);
      expect(await policy.read.curveVersion()).to.equal(before + 1);
    });

    it('rejects a country risk add-on above the maximum', async () => {
      const { policy } = await loadFixture(deployFixture);
      await expectRevert(policy.write.setCountryRisk([COUNTRY, 501]), 'InvalidAddonBps');
    });

    it('rejects an industry risk add-on above the maximum', async () => {
      const { policy } = await loadFixture(deployFixture);
      await expectRevert(policy.write.setIndustryRisk([INDUSTRY, 501]), 'InvalidAddonBps');
    });

    it('reverts when a non-owner sets a concentration cap', async () => {
      const { policy, signers } = await loadFixture(deployFixture);
      const [, stranger] = await hre.viem.getWalletClients();
      await expectRevert(
        policy.write.setConcentrationCap([DEBTOR, CAP], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('evaluateRisk — premium curve', () => {
    const cases: Array<{ score: number; premium: bigint; bucket: string }> = [
      { score: 850, premium: 150n, bucket: 'top (>=800)' },
      { score: 720, premium: 200n, bucket: '720-799' },
      { score: 700, premium: 280n, bucket: '650-719' },
      { score: 600, premium: 400n, bucket: '580-649' },
      { score: 520, premium: 600n, bucket: '500-579' },
      { score: 450, premium: 1000n, bucket: 'floor (<500)' },
    ];

    for (const { score, premium, bucket } of cases) {
      it(`prices a ${bucket} score at ${premium} bps`, async () => {
        const { policy, harness, setUpCoverage } = await loadFixture(deployFixture);
        await setUpCoverage(score);
        await harness.write.evaluateRisk([policy.address, ESCROW_ID]);
        await hre.cofhe.mocks.expectPlaintext(await harness.read.lastRisk(), premium);
      });
    }

    it('adds country and industry risk add-ons to the base premium', async () => {
      const { policy, harness, setUpCoverage } = await loadFixture(deployFixture);
      await policy.write.setCountryRisk([COUNTRY, 200]);
      await policy.write.setIndustryRisk([INDUSTRY, 100]);
      await setUpCoverage(850); // base 150 + 200 + 100 = 450
      await harness.write.evaluateRisk([policy.address, ESCROW_ID]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastRisk(), 450n);
    });

    it('reverts for an escrow with no registered policy', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await expectRevert(
        harness.write.evaluateRisk([policy.address, 9999n]),
        'PolicyNotSet(uint256)',
      );
    });
  });

  describe('judge — dispute resolution', () => {
    it('approves a claim within the credit limit', async () => {
      const { policy, harness, signers, setUpCoverage } = await loadFixture(deployFixture);
      await setUpCoverage(800);
      // Claim flows through the harness, so bind the ciphertext to the harness address.
      const enc = await encryptUint64(signers[0], 10_000, harness.address); // <= 50_000 credit limit
      await harness.write.judge([policy.address, COVERAGE_ID, encodeDisputeProof(enc)]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastValid(), 1n);
    });

    it('rejects a claim above the credit limit', async () => {
      const { policy, harness, signers, setUpCoverage } = await loadFixture(deployFixture);
      await setUpCoverage(800);
      const enc = await encryptUint64(signers[0], 60_000, harness.address); // > 50_000 credit limit
      await harness.write.judge([policy.address, COVERAGE_ID, encodeDisputeProof(enc)]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastValid(), 0n);
    });

    it('reverts when judged by an address that is not the bound manager', async () => {
      const { policy, harness, signers, setUpCoverage } = await loadFixture(deployFixture);
      await setUpCoverage(800);
      const enc = await encryptUint64(signers[0], 10_000);
      // Call policy.judge directly (bound manager is the harness, not this EOA).
      await expectRevert(
        policy.write.judge([COVERAGE_ID, encodeDisputeProof(enc)]),
        'UnauthorizedCaller(uint256)',
      );
    });
  });

  describe('emergency pause (new-business only)', () => {
    it('blocks onPolicySet (new business) while paused', async () => {
      const { policy, harness } = await loadFixture(deployFixture);
      await policy.write.pause();
      await expectRevert(
        harness.write.onPolicySet([policy.address, COVERAGE_ID, encodePolicyData()]),
        'EnforcedPause()',
      );
    });

    it('does NOT trap claim settlement: judge stays live while paused', async () => {
      const { policy, harness, signers, setUpCoverage } = await loadFixture(deployFixture);
      // Coverage is issued before the incident; then the protocol is paused.
      await setUpCoverage(800);
      await policy.write.pause();
      const enc = await encryptUint64(signers[0], 10_000, harness.address); // within credit limit
      await harness.write.judge([policy.address, COVERAGE_ID, encodeDisputeProof(enc)]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastValid(), 1n);
    });
  });

  describe('judge — disputed-debt exclusion', () => {
    async function withDisputeOracle() {
      const ctx = await loadFixture(deployFixture);
      const [owner] = await hre.viem.getWalletClients();
      const disputeOracle = await hre.viem.deployContract('DisputeAttestation', [
        owner.account.address,
        owner.account.address,
      ]);
      await ctx.policy.write.setDisputeOracle([disputeOracle.address]);
      return { ...ctx, disputeOracle };
    }

    it('rejects an otherwise-valid claim when the coverage is disputed', async () => {
      const { policy, harness, signers, setUpCoverage, disputeOracle } = await withDisputeOracle();
      await setUpCoverage(800);
      await disputeOracle.write.attestDispute([COVERAGE_ID, true]);
      // Within the credit limit, but the debt is disputed → excluded.
      const enc = await encryptUint64(signers[0], 10_000, harness.address);
      await harness.write.judge([policy.address, COVERAGE_ID, encodeDisputeProof(enc)]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastValid(), 0n);
    });

    it('approves the same claim once the dispute is cleared', async () => {
      const { policy, harness, signers, setUpCoverage, disputeOracle } = await withDisputeOracle();
      await setUpCoverage(800);
      await disputeOracle.write.attestDispute([COVERAGE_ID, true]);
      await disputeOracle.write.attestDispute([COVERAGE_ID, false]);
      const enc = await encryptUint64(signers[0], 10_000, harness.address);
      await harness.write.judge([policy.address, COVERAGE_ID, encodeDisputeProof(enc)]);
      await hre.cofhe.mocks.expectPlaintext(await harness.read.lastValid(), 1n);
    });

    it('only lets the owner set the dispute oracle', async () => {
      const { policy, disputeOracle, signers } = await withDisputeOracle();
      const [, stranger] = await hre.viem.getWalletClients();
      await expectRevert(
        policy.write.setDisputeOracle([disputeOracle.address], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
      void signers;
    });
  });
});
