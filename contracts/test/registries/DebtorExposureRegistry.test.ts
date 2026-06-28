import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { getAddress, zeroAddress, keccak256, toHex } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';
import { encryptUint64, ethersSigners } from '../helpers/cofhe';

const DEBTOR = keccak256(toHex('debtor-globex'));
const POOL = '0x00000000000000000000000000000000000000a1';
const CAP = 1000n;
// euint64 encodes as bytes32 in the ABI; a 32-byte zero is a placeholder handle
// for calls expected to revert on access control before the handle is ever used.
const ZERO_HANDLE = `0x${'0'.repeat(64)}` as const;

const TRUE = 1n;
const FALSE = 0n;

describe('DebtorExposureRegistry', () => {
  async function deployFixture() {
    const [owner, , stranger] = await hre.viem.getWalletClients();

    const registry = await deployBehindProxy('DebtorExposureRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const harness = await hre.viem.deployContract('RegistryHarness');

    // Authorise the harness to write exposure (stands in for the policy contract).
    await registry.write.registerContract([harness.address]);

    const enc = (value: number | bigint) => ethersSigners().then((s) => encryptUint64(s[0], value));

    return { registry, harness, owner, stranger, enc };
  }

  /** Read the encrypted "within cap" flag recorded by the harness and assert its plaintext. */
  async function expectLastOk(harness: { read: { lastOk: () => Promise<bigint> } }, expected: bigint) {
    const handle = await harness.read.lastOk();
    await hre.cofhe.mocks.expectPlaintext(handle, expected);
  }

  describe('writer whitelist', () => {
    it('marks a registered contract as authorised', async () => {
      const { registry, harness } = await loadFixture(deployFixture);
      expect(await registry.read.isRegistered([harness.address])).to.equal(true);
    });

    it('deregisters a contract', async () => {
      const { registry, harness } = await loadFixture(deployFixture);
      await registry.write.deregisterContract([harness.address]);
      expect(await registry.read.isRegistered([harness.address])).to.equal(false);
    });

    it('reverts when a non-owner registers a contract', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.registerContract([stranger.account.address], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });

    it('reverts addExposure from a non-registered caller', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.addExposure([DEBTOR, POOL, ZERO_HANDLE, CAP], { account: stranger.account }),
        'NotRegisteredContract',
      );
    });

    it('reverts reduceExposure from a non-registered caller', async () => {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        registry.write.reduceExposure([DEBTOR, ZERO_HANDLE], { account: stranger.account }),
        'NotRegisteredContract',
      );
    });
  });

  describe('concentration cap enforcement (FHE)', () => {
    it('accepts exposure within the cap', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(600), CAP]);
      await expectLastOk(harness, TRUE);
    });

    it('accepts exposure exactly at the cap', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1000), CAP]);
      await expectLastOk(harness, TRUE);
    });

    it('rejects exposure that would exceed the cap and leaves the total unchanged', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      // total = 600 (ok)
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(600), CAP]);
      await expectLastOk(harness, TRUE);
      // 600 + 500 = 1100 > 1000 -> rejected, total stays 600
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(500), CAP]);
      await expectLastOk(harness, FALSE);
      // 600 + 400 = 1000 <= 1000 -> accepted, proving the rejected 500 was never added
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(400), CAP]);
      await expectLastOk(harness, TRUE);
    });

    it('enforces the cap on the aggregate total across pools (no pool-splitting bypass)', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      const poolB = '0x00000000000000000000000000000000000000b2';
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(700), CAP]);
      await expectLastOk(harness, TRUE);
      // Different pool, same debtor: 700 + 700 = 1400 > 1000 -> rejected despite separate bucket
      await harness.write.addExposure([registry.address, DEBTOR, poolB, await enc(700), CAP]);
      await expectLastOk(harness, FALSE);
    });
  });

  describe('reduceExposure (FHE saturating subtraction)', () => {
    it('clamps the total to zero when reducing more than the balance', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      // total = 600
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(600), CAP]);
      await expectLastOk(harness, TRUE);
      // reduce 1000 (> 600) -> saturates to 0
      await harness.write.reduceExposure([registry.address, DEBTOR, await enc(1000)]);
      // total now 0: adding the full cap must be accepted
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1000), CAP]);
      await expectLastOk(harness, TRUE);
    });

    it('reduces partially and keeps cap accounting correct', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(900), CAP]);
      await expectLastOk(harness, TRUE);
      // reduce 400 -> total 500
      await harness.write.reduceExposure([registry.address, DEBTOR, await enc(400)]);
      // 500 + 500 = 1000 <= cap -> accepted
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(500), CAP]);
      await expectLastOk(harness, TRUE);
      // 1000 + 1 -> rejected
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1), CAP]);
      await expectLastOk(harness, FALSE);
    });

    it('is a no-op for a debtor with no recorded exposure', async () => {
      const { registry, harness, enc } = await loadFixture(deployFixture);
      const freshDebtor = keccak256(toHex('debtor-never-seen'));
      // Should not revert even though nothing is stored.
      await harness.write.reduceExposure([registry.address, freshDebtor, await enc(100)]);
    });
  });
});
