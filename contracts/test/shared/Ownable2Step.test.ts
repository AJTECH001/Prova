import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { zeroAddress, getAddress } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';

/**
 * Two-step ownership (Ownable2Step) is provided by CoreBase and shared by
 * every Prova plugin. TradeInvoiceResolver is used here as a concrete, FHE-free
 * instance to exercise the base behaviour. The safeguard matters because a single
 * fat-fingered one-step transfer would otherwise brick every owner-gated config and
 * the UUPS upgrade authority.
 */
describe('CoreBase — two-step ownership', () => {
  async function deployFixture() {
    const [owner, escrow, newOwner, stranger] = await hre.viem.getWalletClients();

    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      escrow.account.address,
      zeroAddress,
    ]);

    return { resolver, owner, escrow, newOwner, stranger };
  }

  it('initializes with the deployer-specified owner and no pending owner', async () => {
    const { resolver, owner } = await loadFixture(deployFixture);
    expect(getAddress(await resolver.read.owner())).to.equal(getAddress(owner.account.address));
    expect(getAddress(await resolver.read.pendingOwner())).to.equal(getAddress(zeroAddress));
  });

  it('only the owner may nominate a pending owner', async () => {
    const { resolver, newOwner, stranger } = await loadFixture(deployFixture);
    await expectRevert(
      resolver.write.transferOwnership([newOwner.account.address], {
        account: stranger.account.address,
      }),
      'OwnableUnauthorizedAccount(address)',
    );
  });

  it('transferOwnership nominates a pending owner WITHOUT changing the current owner', async () => {
    const { resolver, owner, newOwner } = await loadFixture(deployFixture);
    await resolver.write.transferOwnership([newOwner.account.address], {
      account: owner.account.address,
    });
    // Authority has NOT moved yet — this is the whole point of two-step.
    expect(getAddress(await resolver.read.owner())).to.equal(getAddress(owner.account.address));
    expect(getAddress(await resolver.read.pendingOwner())).to.equal(
      getAddress(newOwner.account.address),
    );
  });

  it('a non-pending account cannot accept ownership', async () => {
    const { resolver, owner, newOwner, stranger } = await loadFixture(deployFixture);
    await resolver.write.transferOwnership([newOwner.account.address], {
      account: owner.account.address,
    });
    await expectRevert(
      resolver.write.acceptOwnership({ account: stranger.account.address }),
      'OwnableUnauthorizedAccount(address)',
    );
  });

  it('the pending owner completes the handover and the pending slot clears', async () => {
    const { resolver, owner, newOwner } = await loadFixture(deployFixture);
    await resolver.write.transferOwnership([newOwner.account.address], {
      account: owner.account.address,
    });
    await resolver.write.acceptOwnership({ account: newOwner.account.address });

    expect(getAddress(await resolver.read.owner())).to.equal(getAddress(newOwner.account.address));
    expect(getAddress(await resolver.read.pendingOwner())).to.equal(getAddress(zeroAddress));
  });

  it('after handover, owner-gated authority moves to the new owner only', async () => {
    const { resolver, owner, newOwner } = await loadFixture(deployFixture);
    await resolver.write.transferOwnership([newOwner.account.address], {
      account: owner.account.address,
    });
    await resolver.write.acceptOwnership({ account: newOwner.account.address });

    // Old owner can no longer touch owner-gated config.
    await expectRevert(
      resolver.write.setMinWaitingPeriod([7n * 24n * 60n * 60n], {
        account: owner.account.address,
      }),
      'OwnableUnauthorizedAccount(address)',
    );

    // New owner can.
    await resolver.write.setMinWaitingPeriod([7n * 24n * 60n * 60n], {
      account: newOwner.account.address,
    });
    expect(await resolver.read.minWaitingPeriod()).to.equal(7n * 24n * 60n * 60n);
  });
});
