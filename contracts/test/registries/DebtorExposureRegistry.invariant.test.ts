import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { zeroAddress, keccak256, toHex } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { encryptUint64, ethersSigners } from '../helpers/cofhe';

/**
 * Model-based fuzz + invariant test for the solvency guardrail.
 *
 * The registry's whole job is: aggregate insured exposure per debtor MUST NEVER exceed the
 * concentration cap, and the encrypted cap decision MUST match reality. We drive a random
 * sequence of add/reduce operations, maintain a plaintext model of the expected aggregate,
 * and assert on every step that the on-chain encrypted "within cap" flag matches the model.
 * A final pair of boundary probes pins the on-chain total exactly to the model.
 *
 * The RNG is seeded so any failing sequence is deterministically reproducible.
 */

const DEBTOR = keccak256(toHex('debtor-fuzz'));
const POOL = '0x00000000000000000000000000000000000000a1';
const CAP = 1000n;

/** mulberry32 — tiny deterministic PRNG for reproducible fuzzing. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('DebtorExposureRegistry — invariant & fuzz (solvency cap)', () => {
  async function deployFixture() {
    const [owner] = await hre.viem.getWalletClients();
    const registry = await deployBehindProxy('DebtorExposureRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const harness = await hre.viem.deployContract('RegistryHarness');
    await registry.write.registerContract([harness.address]);
    const enc = (value: bigint) => ethersSigners().then((s) => encryptUint64(s[0], value));
    return { registry, harness, enc };
  }

  async function expectLastOk(
    harness: { read: { lastOk: () => Promise<bigint> } },
    expected: bigint,
  ) {
    await hre.cofhe.mocks.expectPlaintext(await harness.read.lastOk(), expected);
  }

  it('random add/reduce sequence: cap flag always matches the model and the cap is never exceeded', async () => {
    const { registry, harness, enc } = await loadFixture(deployFixture);
    const rng = makeRng(0xc0ffee);
    let model = 0n; // expected aggregate total == on-chain exposureTotal

    const ITERATIONS = 16;
    for (let i = 0; i < ITERATIONS; i++) {
      const reduce = i > 0 && rng() < 0.3;
      if (reduce) {
        const amt = BigInt(Math.floor(rng() * 1200)); // may exceed total → saturating
        await harness.write.reduceExposure([registry.address, DEBTOR, await enc(amt)]);
        model = model > amt ? model - amt : 0n;
      } else {
        const amt = BigInt(Math.floor(rng() * 1300)); // 0..1299 → frequently crosses the cap
        const expectedOk = model + amt <= CAP;
        await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(amt), CAP]);
        await expectLastOk(harness, expectedOk ? 1n : 0n);
        if (expectedOk) model = model + amt;
      }
      // Invariant: the accepted aggregate never exceeds the cap.
      expect(model <= CAP, `model ${model} exceeded cap ${CAP} at step ${i}`).to.equal(true);
    }

    // Pin the on-chain total exactly to the model: filling the remainder is accepted,
    // one unit beyond is rejected — only true if on-chain total == model.
    const remaining = CAP - model;
    await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(remaining), CAP]);
    await expectLastOk(harness, 1n);
    await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1n), CAP]);
    await expectLastOk(harness, 0n);
  });

  it('a rejected over-cap add never mutates the total (probed across seeds)', async () => {
    const { registry, harness, enc } = await loadFixture(deployFixture);
    // Fill to exactly the cap.
    await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(CAP), CAP]);
    await expectLastOk(harness, 1n);

    // Several over-cap attempts must all be rejected and leave the total untouched.
    const rng = makeRng(0x1234);
    for (let i = 0; i < 5; i++) {
      const over = BigInt(1 + Math.floor(rng() * 1000));
      await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(over), CAP]);
      await expectLastOk(harness, 0n);
    }
    // Reducing by 1 must free exactly one unit of headroom — proving the total stayed at cap.
    await harness.write.reduceExposure([registry.address, DEBTOR, await enc(1n)]);
    await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1n), CAP]);
    await expectLastOk(harness, 1n);
    await harness.write.addExposure([registry.address, DEBTOR, POOL, await enc(1n), CAP]);
    await expectLastOk(harness, 0n);
  });
});
