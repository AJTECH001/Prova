import hre from 'hardhat';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Encryptable } from '@cofhe/sdk';

/**
 * An encrypted input shaped to match the Solidity `InEuint32` struct
 * (`{ ctHash, securityZone, utype, signature }`) so it can be passed directly
 * to a contract function via viem.
 */
export interface InEuint32 {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
}

/**
 * Produce a real CoFHE-mock encrypted uint32 input, registered in the mock
 * coprocessor state so `FHE.asEuint32(...)` accepts it on-chain and the plaintext
 * can later be asserted with `hre.cofhe.mocks.expectPlaintext(ctHash, value)`.
 *
 * The encryption is bound to `signer`, so submit the resulting input from that
 * same account when the contract validates the proof against `msg.sender`.
 */
export async function encryptUint32(
  signer: HardhatEthersSigner,
  value: number | bigint,
): Promise<InEuint32> {
  const client = await hre.cofhe.createClientWithBatteries(signer);
  const [enc] = await client.encryptInputs([Encryptable.uint32(value)]).execute();
  return {
    ctHash: BigInt(enc.ctHash),
    securityZone: enc.securityZone,
    utype: enc.utype,
    signature: enc.signature as `0x${string}`,
  };
}

/**
 * An encrypted input shaped to match the Solidity `InEuint64` struct.
 */
export interface InEuint64 {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
}

/**
 * Produce a real CoFHE-mock encrypted uint64 input.
 *
 * The mock binds the proof to an `account` and verifies it against the address
 * seen by `FHE.asEuint64` on-chain. Because FHE library functions are `internal`
 * (inlined into the calling contract), that address is the *immediate caller* of
 * the contract that runs `asEuint64`. When a claim is submitted through an
 * intermediary contract (e.g. the coverage manager), pass that contract's address
 * as `account` so the binding matches; otherwise it defaults to the signer's EOA.
 */
export async function encryptUint64(
  signer: HardhatEthersSigner,
  value: number | bigint,
  account?: `0x${string}`,
): Promise<InEuint64> {
  const client = await hre.cofhe.createClientWithBatteries(signer);
  let builder = client.encryptInputs([Encryptable.uint64(BigInt(value))]);
  if (account) builder = builder.setAccount(account);
  const [enc] = await builder.execute();
  return {
    ctHash: BigInt(enc.ctHash),
    securityZone: enc.securityZone,
    utype: enc.utype,
    signature: enc.signature as `0x${string}`,
  };
}

/** Convenience accessor for the Hardhat ethers signers used to seed CoFHE clients. */
export async function ethersSigners(): Promise<HardhatEthersSigner[]> {
  return hre.ethers.getSigners();
}
