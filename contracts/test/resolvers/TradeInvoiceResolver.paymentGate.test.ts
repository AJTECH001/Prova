import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { encodeAbiParameters, parseAbiParameters, zeroAddress, getAddress, type Address } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';
import { expectRevert } from '../helpers/assertions';

const THIRTY_DAYS = 30n * 24n * 60n * 60n;
const NINETY_DAYS = 90n * 24n * 60n * 60n;
const ESCROW_ID = 1n;

const INVOICE_PARAMS = parseAbiParameters(
  'address buyer, address seller, uint256 invoiceAmount, uint256 dueDate, uint256 waitingPeriod',
);

describe('TradeInvoiceResolver — payment-truth gate', () => {
  async function deployFixture() {
    const [owner, escrow, buyer, seller, attestor] = await hre.viem.getWalletClients();

    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      escrow.account.address,
      zeroAddress,
    ]);
    const oracle = await hre.viem.deployContract('ManualPaymentAttestation', [
      owner.account.address,
      attestor.account.address,
    ]);

    const now = BigInt(await time.latest());
    const dueDate = now + NINETY_DAYS;
    const data = encodeAbiParameters(INVOICE_PARAMS, [
      buyer.account.address,
      seller.account.address,
      10_000n,
      dueDate,
      THIRTY_DAYS,
    ]);
    await resolver.write.onConditionSet([ESCROW_ID, data], { account: escrow.account });

    const claimOpensAt = dueDate + THIRTY_DAYS;
    const asEscrow = { account: escrow.account.address as Address };

    return { resolver, oracle, owner, escrow, attestor, claimOpensAt, asEscrow };
  }

  it('is time-only when no oracle is configured (backward compatible)', async () => {
    const { resolver, claimOpensAt, asEscrow } = await loadFixture(deployFixture);
    expect(getAddress(await resolver.read.paymentOracle())).to.equal(zeroAddress);
    await time.increaseTo(claimOpensAt);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(true);
  });

  it('opens the claim after the window when the oracle reports NOT paid', async () => {
    const { resolver, oracle, claimOpensAt, asEscrow } = await loadFixture(deployFixture);
    await resolver.write.setPaymentOracle([oracle.address]);
    await time.increaseTo(claimOpensAt);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(true);
  });

  it('suppresses the claim when the oracle reports the invoice as paid', async () => {
    const { resolver, oracle, attestor, claimOpensAt, asEscrow } = await loadFixture(deployFixture);
    await resolver.write.setPaymentOracle([oracle.address]);
    await oracle.write.attestPayment([ESCROW_ID, true], { account: attestor.account });
    await time.increaseTo(claimOpensAt);
    // Window elapsed, but the buyer paid off-chain → no claim.
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(false);
  });

  it('re-opens the claim if a payment attestation is revoked', async () => {
    const { resolver, oracle, attestor, claimOpensAt, asEscrow } = await loadFixture(deployFixture);
    await resolver.write.setPaymentOracle([oracle.address]);
    await oracle.write.attestPayment([ESCROW_ID, true], { account: attestor.account });
    await time.increaseTo(claimOpensAt);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(false);
    await oracle.write.attestPayment([ESCROW_ID, false], { account: attestor.account });
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(true);
  });

  it('stays closed before the window even if not paid', async () => {
    const { resolver, oracle, asEscrow } = await loadFixture(deployFixture);
    await resolver.write.setPaymentOracle([oracle.address]);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(false);
  });

  it('only lets the owner set the payment oracle', async () => {
    const { resolver, oracle, attestor } = await loadFixture(deployFixture);
    await expectRevert(
      resolver.write.setPaymentOracle([oracle.address], { account: attestor.account }),
      'OwnableUnauthorizedAccount',
    );
  });

  it('can disable the gate by clearing the oracle', async () => {
    const { resolver, oracle, attestor, claimOpensAt, asEscrow } = await loadFixture(deployFixture);
    await resolver.write.setPaymentOracle([oracle.address]);
    await oracle.write.attestPayment([ESCROW_ID, true], { account: attestor.account });
    await time.increaseTo(claimOpensAt);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(false);
    // Clearing the oracle reverts to time-only behaviour.
    await resolver.write.setPaymentOracle([zeroAddress]);
    expect(await resolver.read.isConditionMet([ESCROW_ID], asEscrow)).to.equal(true);
  });
});
