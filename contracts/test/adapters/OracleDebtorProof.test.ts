import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { getAddress, zeroAddress, keccak256, toHex, type Address } from 'viem';
import { expectRevert } from '../helpers/assertions';
import { encryptUint32, ethersSigners } from '../helpers/cofhe';

const DEBTOR_ID = keccak256(toHex('debtor-acme-ltd'));
const SCORE = 820;

describe('OracleDebtorProof', () => {
  async function deployFixture() {
    const [owner, oracle, stranger, policy] = await hre.viem.getWalletClients();

    const proof = await hre.viem.deployContract('OracleDebtorProof', [
      owner.account.address,
      oracle.account.address,
    ]);

    const signers = await ethersSigners();
    // signers[1] corresponds to the oracle wallet client (same default mnemonic ordering).
    const oracleSigner = signers[1];

    return { proof, owner, oracle, stranger, policy, oracleSigner };
  }

  /** Build a structurally-valid-looking InEuint32 with overridable fields (no real ciphertext). */
  function fakeInput(overrides: Partial<{ ctHash: bigint; securityZone: number; utype: number; signature: `0x${string}` }> = {}) {
    return {
      ctHash: 1n,
      securityZone: 0,
      utype: 4,
      signature: '0xabcd' as `0x${string}`,
      ...overrides,
    };
  }

  describe('initialization', () => {
    it('sets the owner and oracle', async () => {
      const { proof, owner, oracle } = await loadFixture(deployFixture);
      expect(getAddress(await proof.read.owner())).to.equal(getAddress(owner.account.address));
      expect(getAddress(await proof.read.oracle())).to.equal(getAddress(oracle.account.address));
    });

    it('reports no score before any is set', async () => {
      const { proof } = await loadFixture(deployFixture);
      expect(await proof.read.hasScore([DEBTOR_ID])).to.equal(false);
    });
  });

  describe('setOracle', () => {
    it('lets the owner rotate the oracle', async () => {
      const { proof, stranger } = await loadFixture(deployFixture);
      await proof.write.setOracle([stranger.account.address]);
      expect(getAddress(await proof.read.oracle())).to.equal(getAddress(stranger.account.address));
    });

    it('reverts when set to the zero address', async () => {
      const { proof } = await loadFixture(deployFixture);
      await expectRevert(proof.write.setOracle([zeroAddress]), 'InvalidCiphertextZeroHash');
    });

    it('reverts when a non-owner rotates the oracle', async () => {
      const { proof, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        proof.write.setOracle([stranger.account.address], { account: stranger.account }),
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('setScore — access control', () => {
    it('reverts when caller is neither oracle nor owner', async () => {
      const { proof, stranger } = await loadFixture(deployFixture);
      await expectRevert(
        proof.write.setScore([DEBTOR_ID, fakeInput()], { account: stranger.account }),
        'NotAuthorizedOracle',
      );
    });
  });

  describe('setScore — ciphertext validation', () => {
    it('reverts on a zero ctHash', async () => {
      const { proof, oracle } = await loadFixture(deployFixture);
      await expectRevert(
        proof.write.setScore([DEBTOR_ID, fakeInput({ ctHash: 0n })], { account: oracle.account }),
        'InvalidCiphertextZeroHash',
      );
    });

    it('reverts on an empty signature', async () => {
      const { proof, oracle } = await loadFixture(deployFixture);
      await expectRevert(
        proof.write.setScore([DEBTOR_ID, fakeInput({ signature: '0x' })], { account: oracle.account }),
        'InvalidCiphertextEmptySignature',
      );
    });

    it('reverts on a wrong FHE utype', async () => {
      const { proof, oracle } = await loadFixture(deployFixture);
      await expectRevert(
        proof.write.setScore([DEBTOR_ID, fakeInput({ utype: 5 })], { account: oracle.account }),
        'InvalidCiphertextType',
      );
    });
  });

  describe('setScore — happy path (real CoFHE-mock ciphertext)', () => {
    it('stores an encrypted score submitted by the oracle', async () => {
      const { proof, oracle, oracleSigner } = await loadFixture(deployFixture);
      const enc = await encryptUint32(oracleSigner, SCORE);

      await proof.write.setScore([DEBTOR_ID, enc], { account: oracle.account });

      expect(await proof.read.hasScore([DEBTOR_ID])).to.equal(true);
    });

    it('exposes the encrypted score via getScore with the correct plaintext', async () => {
      const { proof, oracle, oracleSigner, policy } = await loadFixture(deployFixture);
      const enc = await encryptUint32(oracleSigner, SCORE);
      await proof.write.setScore([DEBTOR_ID, enc], { account: oracle.account });

      // getScore is non-view (grants ACL); simulate to read the returned euint32 handle.
      const { result } = await proof.simulate.getScore([DEBTOR_ID], {
        account: policy.account.address as Address,
      });
      const [scoreHandle] = result as unknown as [bigint, bigint];

      await hre.cofhe.mocks.expectPlaintext(scoreHandle, BigInt(SCORE));
    });
  });

  describe('getScore', () => {
    it('reverts when no score is set for the debtor', async () => {
      const { proof, policy } = await loadFixture(deployFixture);
      await expectRevert(
        proof.simulate.getScore([DEBTOR_ID], { account: policy.account.address as Address }),
        'ScoreNotSet',
      );
    });
  });
});
