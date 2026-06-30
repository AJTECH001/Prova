import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { getAddress, zeroAddress } from 'viem';
import { expectRevert } from '../helpers/assertions';

const ESCROW_ID = 7n;

describe('ManualPaymentAttestation', () => {
  async function deployFixture() {
    const [owner, attestor, stranger] = await hre.viem.getWalletClients();
    const oracle = await hre.viem.deployContract('ManualPaymentAttestation', [
      owner.account.address,
      attestor.account.address,
    ]);
    return { oracle, owner, attestor, stranger };
  }

  describe('initialization', () => {
    it('sets owner and attestor', async () => {
      const { oracle, owner, attestor } = await loadFixture(deployFixture);
      expect(getAddress(await oracle.read.owner())).to.equal(getAddress(owner.account.address));
      expect(getAddress(await oracle.read.attestor())).to.equal(getAddress(attestor.account.address));
    });

    it('reverts when the initial attestor is the zero address', async () => {
      const [owner] = await hre.viem.getWalletClients();
      await expectRevert(
        hre.viem.deployContract('ManualPaymentAttestation', [owner.account.address, zeroAddress]),
        'ZeroAddress',
      );
    });

    it('defaults isPaid to false', async () => {
      const { oracle } = await loadFixture(deployFixture);
      expect(await oracle.read.isPaid([ESCROW_ID])).to.equal(false);
    });
  });

  describe('attestPayment', () => {
    it('lets the attestor mark an invoice paid', async () => {
      const { oracle, attestor } = await loadFixture(deployFixture);
      await oracle.write.attestPayment([ESCROW_ID, true], { account: attestor.account });
      expect(await oracle.read.isPaid([ESCROW_ID])).to.equal(true);
    });

    it('lets the owner attest as well', async () => {
      const { oracle } = await loadFixture(deployFixture);
      await oracle.write.attestPayment([ESCROW_ID, true]);
      expect(await oracle.read.isPaid([ESCROW_ID])).to.equal(true);
    });

    it('can revoke a prior attestation', async () => {
      const { oracle, attestor } = await loadFixture(deployFixture);
      await oracle.write.attestPayment([ESCROW_ID, true], { account: attestor.account });
      await oracle.write.attestPayment([ESCROW_ID, false], { account: attestor.account });
      expect(await oracle.read.isPaid([ESCROW_ID])).to.equal(false);
    });

    it('reverts for an unauthorized caller', async () => {
      const { oracle, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        oracle.write.attestPayment([ESCROW_ID, true], { account: stranger.account }),
        'NotAuthorizedAttestor',
      );
    });
  });

  describe('setAttestor', () => {
    it('rotates the attestor (owner only)', async () => {
      const { oracle, stranger } = await loadFixture(deployFixture);
      await oracle.write.setAttestor([stranger.account.address]);
      expect(getAddress(await oracle.read.attestor())).to.equal(getAddress(stranger.account.address));
    });

    it('reverts on zero address', async () => {
      const { oracle } = await loadFixture(deployFixture);
      await expectRevert(oracle.write.setAttestor([zeroAddress]), 'ZeroAddress');
    });

    it('reverts for a non-owner', async () => {
      const { oracle, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        oracle.write.setAttestor([stranger.account.address], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });
  });
});
