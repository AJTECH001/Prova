import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import {
  encodeAbiParameters,
  parseAbiParameters,
  zeroAddress,
  getAddress,
  type Address,
} from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';

const THIRTY_DAYS = 30n * 24n * 60n * 60n;
const NINETY_DAYS = 90n * 24n * 60n * 60n;
const ONE_HUNDRED_EIGHTY_DAYS = 180n * 24n * 60n * 60n;

const INVOICE_PARAMS = parseAbiParameters(
  'address buyer, address seller, uint256 invoiceAmount, uint256 dueDate, uint256 waitingPeriod',
);

function encodeInvoice(opts: {
  buyer: Address;
  seller: Address;
  invoiceAmount: bigint;
  dueDate: bigint;
  waitingPeriod: bigint;
}): `0x${string}` {
  return encodeAbiParameters(INVOICE_PARAMS, [
    opts.buyer,
    opts.seller,
    opts.invoiceAmount,
    opts.dueDate,
    opts.waitingPeriod,
  ]);
}

describe('TradeInvoiceResolver', () => {
  async function deployFixture() {
    const [owner, escrow, buyer, seller, stranger] = await hre.viem.getWalletClients();

    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      escrow.account.address,
      zeroAddress,
    ]);

    const now = BigInt(await time.latest());
    const defaultInvoice = {
      buyer: buyer.account.address,
      seller: seller.account.address,
      invoiceAmount: 10_000n,
      dueDate: now + NINETY_DAYS,
      waitingPeriod: THIRTY_DAYS,
    };

    return { resolver, owner, escrow, buyer, seller, stranger, now, defaultInvoice };
  }

  describe('initialization', () => {
    it('sets the owner and escrow contract', async () => {
      const { resolver, owner, escrow } = await loadFixture(deployFixture);
      expect(getAddress(await resolver.read.owner())).to.equal(
        getAddress(owner.account.address),
      );
      expect(getAddress(await resolver.read.escrowContract())).to.equal(
        getAddress(escrow.account.address),
      );
    });

    it('reverts when re-initialized', async () => {
      const { resolver, owner, escrow } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.initialize([owner.account.address, escrow.account.address, zeroAddress]),
        'InvalidInitialization()',
      );
    });

    it('exposes the industry-standard waiting-period bounds', async () => {
      const { resolver } = await loadFixture(deployFixture);
      expect(await resolver.read.MIN_WAITING_PERIOD()).to.equal(THIRTY_DAYS);
      expect(await resolver.read.MAX_WAITING_PERIOD()).to.equal(ONE_HUNDRED_EIGHTY_DAYS);
    });

    it('supports the IConditionResolver and ERC-165 interfaces', async () => {
      const { resolver } = await loadFixture(deployFixture);
      // ERC-165 interfaceId
      expect(await resolver.read.supportsInterface(['0x01ffc9a7'])).to.equal(true);
      // Non-supported random interfaceId
      expect(await resolver.read.supportsInterface(['0xffffffff'])).to.equal(false);
    });
  });

  describe('onConditionSet — access control', () => {
    it('reverts when caller is not the escrow contract', async () => {
      const { resolver, stranger, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
          account: stranger.account,
        }),
        'UnauthorizedCaller',
      );
    });

    it('allows the escrow contract to register a condition', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      // Bound escrow can now query the condition (not yet met).
      expect(
        await resolver.read.isConditionMet([1n], { account: escrow.account.address }),
      ).to.equal(false);
    });

    it('reverts when the same escrowId is registered twice', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      // Second registration for the same id with a different invoice (avoid dup-hash revert).
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, invoiceAmount: 20_000n })],
          { account: escrow.account },
        ),
        'ConditionAlreadySet(uint256)',
      );
    });
  });

  describe('onConditionSet — input validation', () => {
    it('reverts on zero buyer', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, buyer: zeroAddress })],
          { account: escrow.account },
        ),
        'InvalidBuyer',
      );
    });

    it('reverts on zero seller', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, seller: zeroAddress })],
          { account: escrow.account },
        ),
        'InvalidSeller',
      );
    });

    it('reverts when buyer equals seller', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, seller: defaultInvoice.buyer })],
          { account: escrow.account },
        ),
        'InvalidSeller',
      );
    });

    it('reverts on zero invoice amount', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, invoiceAmount: 0n })],
          { account: escrow.account },
        ),
        'InvalidAmount',
      );
    });

    it('reverts when the due date is in the past', async () => {
      const { resolver, escrow, defaultInvoice, now } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, dueDate: now - 1n })],
          { account: escrow.account },
        ),
        'InvalidDueDate',
      );
    });

    it('reverts when the waiting period is below the minimum', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, waitingPeriod: THIRTY_DAYS - 1n })],
          { account: escrow.account },
        ),
        'InvalidWaitingPeriod',
      );
    });

    it('reverts when the waiting period is above the maximum', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.onConditionSet(
          [1n, encodeInvoice({ ...defaultInvoice, waitingPeriod: ONE_HUNDRED_EIGHTY_DAYS + 1n })],
          { account: escrow.account },
        ),
        'InvalidWaitingPeriod',
      );
    });

    it('accepts the minimum and maximum waiting periods', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet(
        [1n, encodeInvoice({ ...defaultInvoice, waitingPeriod: THIRTY_DAYS })],
        { account: escrow.account },
      );
      await resolver.write.onConditionSet(
        [2n, encodeInvoice({ ...defaultInvoice, waitingPeriod: ONE_HUNDRED_EIGHTY_DAYS, invoiceAmount: 1n })],
        { account: escrow.account },
      );
    });
  });

  describe('duplicate invoice detection', () => {
    it('reverts when the same invoice is registered under a different escrow', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      await expectRevert(
        resolver.write.onConditionSet([2n, encodeInvoice(defaultInvoice)], {
          account: escrow.account,
        }),
        'InvoiceAlreadyRegistered',
      );
    });

    it('allows distinct invoices (different amount) under different escrows', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      await resolver.write.onConditionSet(
        [2n, encodeInvoice({ ...defaultInvoice, invoiceAmount: 99_999n })],
        { account: escrow.account },
      );
    });
  });

  describe('isConditionMet', () => {
    it('reverts for a caller that is not the bound escrow', async () => {
      const { resolver, escrow, stranger, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      await expectRevert(
        resolver.read.isConditionMet([1n], { account: stranger.account.address }),
        'UnauthorizedCaller(uint256)',
      );
    });

    it('returns false before due date + waiting period elapses', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      expect(
        await resolver.read.isConditionMet([1n], { account: escrow.account.address }),
      ).to.equal(false);
    });

    it('returns true once due date + waiting period has elapsed', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      // Advance to exactly dueDate + waitingPeriod.
      await time.increaseTo(defaultInvoice.dueDate + defaultInvoice.waitingPeriod);
      expect(
        await resolver.read.isConditionMet([1n], { account: escrow.account.address }),
      ).to.equal(true);
    });

    it('remains false one second before the claim window opens', async () => {
      const { resolver, escrow, defaultInvoice } = await loadFixture(deployFixture);
      await resolver.write.onConditionSet([1n, encodeInvoice(defaultInvoice)], {
        account: escrow.account,
      });
      await time.increaseTo(defaultInvoice.dueDate + defaultInvoice.waitingPeriod - 2n);
      expect(
        await resolver.read.isConditionMet([1n], { account: escrow.account.address }),
      ).to.equal(false);
    });
  });

  describe('condition fee', () => {
    it('defaults to zero bps and zero recipient', async () => {
      const { resolver } = await loadFixture(deployFixture);
      const [bps, recipient] = await resolver.read.getConditionFee();
      expect(bps).to.equal(0);
      expect(recipient).to.equal(zeroAddress);
    });

    it('lets the owner set the fee', async () => {
      const { resolver, stranger } = await loadFixture(deployFixture);
      await resolver.write.setConditionFee([250, stranger.account.address]);
      const [bps, recipient] = await resolver.read.getConditionFee();
      expect(bps).to.equal(250);
      expect(getAddress(recipient)).to.equal(getAddress(stranger.account.address));
    });

    it('reverts when fee exceeds 100%', async () => {
      const { resolver, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.setConditionFee([10_001, stranger.account.address]),
        'InvalidFeeBps',
      );
    });

    it('reverts when a non-zero fee has a zero recipient', async () => {
      const { resolver } = await loadFixture(deployFixture);
      await expectRevert(resolver.write.setConditionFee([100, zeroAddress]), 'ZeroAddress');
    });

    it('reverts when a non-owner sets the fee', async () => {
      const { resolver, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.setConditionFee([100, stranger.account.address], {
          account: stranger.account,
        }),
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('owner administration', () => {
    it('lets the owner update the escrow contract', async () => {
      const { resolver, stranger } = await loadFixture(deployFixture);
      await resolver.write.setEscrowContract([stranger.account.address]);
      expect(getAddress(await resolver.read.escrowContract())).to.equal(
        getAddress(stranger.account.address),
      );
    });

    it('reverts when setting the escrow contract to the zero address', async () => {
      const { resolver } = await loadFixture(deployFixture);
      await expectRevert(resolver.write.setEscrowContract([zeroAddress]), 'ZeroAddress');
    });

    it('reverts when a non-owner updates the escrow contract', async () => {
      const { resolver, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        resolver.write.setEscrowContract([stranger.account.address], {
          account: stranger.account,
        }),
        'OwnableUnauthorizedAccount',
      );
    });
  });
});
