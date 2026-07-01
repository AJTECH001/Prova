import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { zeroAddress, type Address } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';
import { encryptUint64, ethersSigners } from '../helpers/cofhe';

const ZERO_HANDLE = `0x${'0'.repeat(64)}` as const;
const CURVE_V1 = 1;
const CURVE_V2 = 2;

interface LossEntry {
  coverageId: bigint;
  encClaimAmount: `0x${string}`;
  timestamp: bigint;
  curveVersion: number;
}

describe('InsuranceClaimsRegistry', () => {
  async function deployFixture() {
    const [owner, , reader, stranger] = await hre.viem.getWalletClients();

    const registry = await deployBehindProxy('InsuranceClaimsRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const harness = await hre.viem.deployContract('RegistryHarness');

    // Harness writes claims; reader is an authorised EOA used to query.
    await registry.write.registerPolicy([harness.address]);
    await registry.write.registerPolicy([reader.account.address]);

    const enc = (value: number | bigint) => ethersSigners().then((s) => encryptUint64(s[0], value));

    return { registry, harness, owner, reader, stranger, enc };
  }

  async function read(
    registry: { read: { recordsForCurve: (args: readonly unknown[], opts?: unknown) => Promise<unknown> } },
    reader: Address,
    version: number,
    cursor: bigint,
    limit: bigint,
  ): Promise<LossEntry[]> {
    return (await registry.read.recordsForCurve([version, cursor, limit], {
      account: reader,
    })) as LossEntry[];
  }

  describe('loss-history commitment (SCR §124)', () => {
    const ROOT_A = `0x${'11'.repeat(32)}` as const;
    const ROOT_B = `0x${'22'.repeat(32)}` as const;

    it('starts with an empty commitment', async () => {
      const { registry } = await loadFixture(deployFixture);
      const [root, epoch, committedAt, entryCount] = await registry.read.latestCommitment();
      expect(root).to.equal(`0x${'0'.repeat(64)}`);
      expect(epoch).to.equal(0n);
      expect(committedAt).to.equal(0n);
      expect(entryCount).to.equal(0n);
    });

    it('records a commitment and advances the epoch monotonically', async () => {
      const { registry } = await loadFixture(deployFixture);
      await registry.write.commitLossRoot([ROOT_A, 3n]);
      const [root, epoch, committedAt, entryCount] = await registry.read.latestCommitment();
      expect(root).to.equal(ROOT_A);
      expect(epoch).to.equal(1n);
      expect(committedAt > 0n).to.equal(true);
      expect(entryCount).to.equal(3n);

      await registry.write.commitLossRoot([ROOT_B, 5n]);
      const [root2, epoch2, , entryCount2] = await registry.read.latestCommitment();
      expect(root2).to.equal(ROOT_B);
      expect(epoch2).to.equal(2n);
      expect(entryCount2).to.equal(5n);
    });

    it('reverts a zero Merkle root', async () => {
      const { registry } = await loadFixture(deployFixture);
      await expectRevert(registry.write.commitLossRoot([ZERO_HANDLE, 1n]), 'InvalidRoot');
    });

    it('rejects a non-monotonic entry count but allows an equal count (re-commit)', async () => {
      const { registry } = await loadFixture(deployFixture);
      await registry.write.commitLossRoot([ROOT_A, 10n]);
      await expectRevert(registry.write.commitLossRoot([ROOT_B, 9n]), 'NonMonotonicCount');
      await registry.write.commitLossRoot([ROOT_B, 10n]); // equal count OK
      const [root, epoch] = await registry.read.latestCommitment();
      expect(root).to.equal(ROOT_B);
      expect(epoch).to.equal(2n);
    });

    it('only the owner may commit', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.commitLossRoot([ROOT_A, 1n], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('access control', () => {
    it('reverts when a non-owner registers a policy', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.registerPolicy([stranger.account.address], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });

    it('reverts logClaim from a non-whitelisted caller', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.logClaim([1n, CURVE_V1, ZERO_HANDLE], { account: stranger.account }),
        'NotAProvaContract()',
      );
    });

    it('reverts recordsForCurve from a non-whitelisted caller', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.read.recordsForCurve([CURVE_V1, 0n, 10n], { account: stranger.account.address }),
        'NotAProvaContract()',
      );
    });
  });

  describe('logClaim + recordsForCurve', () => {
    it('returns an empty slice when there are no entries', async () => {
      const { registry, reader } = await loadFixture(deployFixture);
      const entries = await read(registry, reader.account.address, CURVE_V1, 0n, 10n);
      expect(entries.length).to.equal(0);
    });

    it('stores a claim with the correct coverage, version, and encrypted amount', async () => {
      const { registry, harness, reader, enc } = await loadFixture(deployFixture);
      await harness.write.logClaim([registry.address, 42n, CURVE_V1, await enc(7500)]);

      const entries = await read(registry, reader.account.address, CURVE_V1, 0n, 10n);
      expect(entries.length).to.equal(1);
      expect(entries[0].coverageId).to.equal(42n);
      expect(entries[0].curveVersion).to.equal(CURVE_V1);
      expect(entries[0].timestamp).to.be.greaterThan(0n);
      await hre.cofhe.mocks.expectPlaintext(entries[0].encClaimAmount, 7500n);
    });

    it('filters entries by curve version', async () => {
      const { registry, harness, reader, enc } = await loadFixture(deployFixture);
      await harness.write.logClaim([registry.address, 1n, CURVE_V1, await enc(100)]);
      await harness.write.logClaim([registry.address, 2n, CURVE_V2, await enc(200)]);
      await harness.write.logClaim([registry.address, 3n, CURVE_V1, await enc(300)]);

      const v1 = await read(registry, reader.account.address, CURVE_V1, 0n, 10n);
      const v2 = await read(registry, reader.account.address, CURVE_V2, 0n, 10n);

      expect(v1.map((e) => e.coverageId)).to.deep.equal([1n, 3n]);
      expect(v2.map((e) => e.coverageId)).to.deep.equal([2n]);
    });

    it('honours cursor-based pagination', async () => {
      const { registry, harness, reader, enc } = await loadFixture(deployFixture);
      await harness.write.logClaim([registry.address, 1n, CURVE_V1, await enc(100)]);
      await harness.write.logClaim([registry.address, 2n, CURVE_V1, await enc(200)]);
      await harness.write.logClaim([registry.address, 3n, CURVE_V1, await enc(300)]);

      // Window [0,2): first two keys evaluated.
      const firstPage = await read(registry, reader.account.address, CURVE_V1, 0n, 2n);
      expect(firstPage.map((e) => e.coverageId)).to.deep.equal([1n, 2n]);

      // Window [2,4) clamped to total: last key only.
      const secondPage = await read(registry, reader.account.address, CURVE_V1, 2n, 2n);
      expect(secondPage.map((e) => e.coverageId)).to.deep.equal([3n]);

      // Cursor beyond total: empty.
      const beyond = await read(registry, reader.account.address, CURVE_V1, 99n, 2n);
      expect(beyond.length).to.equal(0);
    });
  });
});
