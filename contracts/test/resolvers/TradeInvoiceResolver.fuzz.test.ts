import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { encodeAbiParameters, parseAbiParameters, zeroAddress, type Address } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';

/**
 * Fuzz the protracted-default claim window: across many random (dueDate, waitingPeriod)
 * pairs within the allowed bounds, a claim must open at EXACTLY dueDate + waitingPeriod —
 * false one second before, true at the boundary. This guards the resolver's time arithmetic
 * against off-by-one / overflow regressions. Seeded RNG → reproducible.
 */

const DAY = 86_400n;
const MIN_WAIT = 30n * DAY; // resolver default minWaitingPeriod
const MAX_WAIT = 180n * DAY; // MAX_WAITING_PERIOD

const INVOICE_PARAMS = parseAbiParameters(
  'address buyer, address seller, uint256 invoiceAmount, uint256 dueDate, uint256 waitingPeriod',
);

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('TradeInvoiceResolver — fuzz (claim-window boundary)', () => {
  async function deployFixture() {
    const [owner, escrow, buyer, seller] = await hre.viem.getWalletClients();
    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      escrow.account.address,
      zeroAddress,
    ]);
    return { resolver, escrow, buyer, seller };
  }

  it('claim opens at exactly dueDate + waitingPeriod across random terms', async () => {
    const rng = makeRng(0xbeef);
    const ITERATIONS = 24;

    for (let i = 0; i < ITERATIONS; i++) {
      // loadFixture reverts to the post-deploy snapshot each iteration, resetting block time.
      const { resolver, escrow, buyer, seller } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());

      const dueDate = now + BigInt(1 + Math.floor(rng() * 60)) * DAY; // 1..60 days out
      const waitingPeriod = MIN_WAIT + BigInt(Math.floor(rng() * Number(MAX_WAIT - MIN_WAIT)));
      const escrowId = 1n;
      const data = encodeAbiParameters(INVOICE_PARAMS, [
        buyer.account.address as Address,
        seller.account.address as Address,
        1_000n,
        dueDate,
        waitingPeriod,
      ]);
      await resolver.write.onConditionSet([escrowId, data], { account: escrow.account.address });

      const boundary = dueDate + waitingPeriod;
      const read = () =>
        resolver.read.isConditionMet([escrowId], { account: escrow.account.address });

      // One second before the boundary: claim is NOT open.
      await time.increaseTo(boundary - 1n);
      expect(await read(), `claim opened early at step ${i}`).to.equal(false);

      // At the boundary: claim opens.
      await time.increaseTo(boundary);
      expect(await read(), `claim failed to open at boundary at step ${i}`).to.equal(true);
    }
  });
});
