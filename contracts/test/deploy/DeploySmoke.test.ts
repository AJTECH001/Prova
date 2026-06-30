import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { zeroAddress, getAddress } from 'viem';
import { deployBehindProxy } from '../helpers/proxy';

/**
 * Production deploy smoke-test — mirrors scripts/deploy.ts.
 *
 * Guards against contract-signature drift silently breaking the production deploy
 * (the exact bug class fixed 2026-06-30: initializer arity mismatch, the coverage
 * manager passed as the trusted forwarder, and the missing CCM whitelist). If any
 * initializer signature or wiring contract changes, this test fails — forcing
 * scripts/deploy.ts to be updated in lockstep.
 */

// Reineira platform addresses (Arbitrum Sepolia) — only ever stored, never called here.
const ESCROW = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';
const COVERAGE_MANAGER = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

describe('deploy smoke-test — production wiring', () => {
  async function deployFixture() {
    const [owner, oracle, multisig] = await hre.viem.getWalletClients();

    // 1. OracleDebtorProof — plain Ownable, constructor(initialOwner, initialOracle).
    const debtorProof = await hre.viem.deployContract('OracleDebtorProof', [
      owner.account.address,
      oracle.account.address,
    ]);

    // 2-3. Registries — UUPS, initialize(initialOwner, trustedForwarder).
    const exposureRegistry = await deployBehindProxy('DebtorExposureRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);
    const claimsRegistry = await deployBehindProxy('InsuranceClaimsRegistry', 'initialize', [
      owner.account.address,
      zeroAddress,
    ]);

    // 4. Resolver — UUPS, initialize(initialOwner, escrow, trustedForwarder).
    const resolver = await deployBehindProxy('TradeInvoiceResolver', 'initialize', [
      owner.account.address,
      ESCROW,
      zeroAddress,
    ]);

    // 5. Policy — UUPS, initialize(owner, debtorProof, exposure, claims, trustedForwarder).
    const policy = await deployBehindProxy('TradeCreditInsurancePolicy', 'initialize', [
      owner.account.address,
      debtorProof.address,
      exposureRegistry.address,
      claimsRegistry.address,
      zeroAddress,
    ]);

    // Wiring — mirrors deploy.ts exactly.
    await exposureRegistry.write.registerContract([policy.address]);
    await claimsRegistry.write.registerPolicy([policy.address]);
    await policy.write.setAllowedContract([COVERAGE_MANAGER, true]);

    return { owner, multisig, debtorProof, exposureRegistry, claimsRegistry, resolver, policy };
  }

  it('deploys all five contracts and wires their dependencies', async () => {
    const { debtorProof, exposureRegistry, claimsRegistry, resolver, policy } =
      await loadFixture(deployFixture);

    expect(getAddress(await policy.read.debtorProofAdapter())).to.equal(
      getAddress(debtorProof.address),
    );
    expect(getAddress(await policy.read.exposureRegistry())).to.equal(
      getAddress(exposureRegistry.address),
    );
    expect(getAddress(await policy.read.lossHistory())).to.equal(
      getAddress(claimsRegistry.address),
    );
    expect(getAddress(await resolver.read.escrowContract())).to.equal(getAddress(ESCROW));
  });

  it('authorises the policy as a registry writer', async () => {
    const { exposureRegistry, policy } = await loadFixture(deployFixture);
    expect(await exposureRegistry.read.isRegistered([policy.address])).to.equal(true);
  });

  it('whitelists the coverage manager (without this, coverage issuance reverts)', async () => {
    const { policy } = await loadFixture(deployFixture);
    expect(await policy.read.isAllowedContract([COVERAGE_MANAGER])).to.equal(true);
  });

  it('leaves every contract owned by the deployer and unpaused', async () => {
    const { owner, exposureRegistry, claimsRegistry, resolver, policy } =
      await loadFixture(deployFixture);
    for (const c of [exposureRegistry, claimsRegistry, resolver, policy]) {
      expect(getAddress(await c.read.owner())).to.equal(getAddress(owner.account.address));
      expect(await c.read.paused()).to.equal(false);
    }
  });

  it('supports the production Ownable2Step ownership handoff to a multisig', async () => {
    const { owner, multisig, policy } = await loadFixture(deployFixture);
    await policy.write.transferOwnership([multisig.account.address], {
      account: owner.account.address,
    });
    // Two-step: owner unchanged until the multisig accepts.
    expect(getAddress(await policy.read.owner())).to.equal(getAddress(owner.account.address));
    expect(getAddress(await policy.read.pendingOwner())).to.equal(
      getAddress(multisig.account.address),
    );
    await policy.write.acceptOwnership({ account: multisig.account.address });
    expect(getAddress(await policy.read.owner())).to.equal(getAddress(multisig.account.address));
  });
});
