import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { encodeAbiParameters, parseAbiParameters, zeroAddress, type Address } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';

/**
 * Emergency-stop semantics (CoreBase + PausableUpgradeable), scope = NEW BUSINESS ONLY.
 *
 * The load-bearing guarantee: a pause freezes new coverage/condition registration but MUST NOT
 * trap claim resolution. TradeInvoiceResolver is the FHE-free vehicle to prove both halves —
 * `onConditionSet` (new business) is gated, `isConditionMet` (claim resolution) stays live.
 */
const ONE_DAY = 24n * 60n * 60n;
const THIRTY_DAYS = 30n * ONE_DAY;

const INVOICE_PARAMS = parseAbiParameters(
  'address buyer, address seller, uint256 invoiceAmount, uint256 dueDate, uint256 waitingPeriod',
);

describe('CoreBase — emergency pause (new-business only)', () => {
  async function deployFixture() {
    const [owner, escrow, buyer, seller, stranger] = await hre.viem.getWalletClients();
    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      escrow.account.address,
      zeroAddress,
    ]);
    const now = BigInt(await time.latest());
    const invoice = encodeAbiParameters(INVOICE_PARAMS, [
      buyer.account.address as Address,
      seller.account.address as Address,
      10_000n,
      now + ONE_DAY, // dueDate
      THIRTY_DAYS, // waitingPeriod
    ]);
    return { resolver, owner, escrow, stranger, now, invoice };
  }

  it('starts unpaused', async () => {
    const { resolver } = await loadFixture(deployFixture);
    expect(await resolver.read.paused()).to.equal(false);
  });

  it('only the owner may pause or unpause', async () => {
    const { resolver, owner, stranger } = await loadFixture(deployFixture);
    await expectRevert(
      resolver.write.pause({ account: stranger.account.address }),
      'OwnableUnauthorizedAccount(address)',
    );
    await resolver.write.pause({ account: owner.account.address });
    await expectRevert(
      resolver.write.unpause({ account: stranger.account.address }),
      'OwnableUnauthorizedAccount(address)',
    );
  });

  it('blocks NEW business (onConditionSet) while paused', async () => {
    const { resolver, owner, escrow, invoice } = await loadFixture(deployFixture);
    await resolver.write.pause({ account: owner.account.address });
    expect(await resolver.read.paused()).to.equal(true);
    await expectRevert(
      resolver.write.onConditionSet([1n, invoice], { account: escrow.account.address }),
      'EnforcedPause()',
    );
  });

  it('does NOT trap claim resolution: isConditionMet stays live while paused', async () => {
    const { resolver, owner, escrow, invoice } = await loadFixture(deployFixture);
    // Register coverage BEFORE pausing.
    await resolver.write.onConditionSet([1n, invoice], { account: escrow.account.address });

    // Pause, then advance past the protracted-default window.
    await resolver.write.pause({ account: owner.account.address });
    await time.increase(ONE_DAY + THIRTY_DAYS + 1n);

    // Claim resolution must still succeed even though the protocol is paused.
    expect(await resolver.read.isConditionMet([1n], { account: escrow.account.address })).to.equal(
      true,
    );
  });

  it('resumes new business after unpause', async () => {
    const { resolver, owner, escrow, invoice } = await loadFixture(deployFixture);
    await resolver.write.pause({ account: owner.account.address });
    await resolver.write.unpause({ account: owner.account.address });
    await resolver.write.onConditionSet([1n, invoice], { account: escrow.account.address });
    // No revert ⇒ new business flows again.
    expect(await resolver.read.paused()).to.equal(false);
  });
});
