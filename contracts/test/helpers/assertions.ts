import { expect } from 'chai';
import { keccak256, toHex } from 'viem';

/**
 * Toolchain-agnostic revert assertion.
 *
 * viem usually surfaces Solidity custom errors by name inside the thrown error
 * message (e.g. `... reverted ... InvalidBuyer()`), so a substring match on the
 * error name works. Occasionally viem fails to decode an inherited custom error
 * and reports only the raw `return data: 0x<selector>...`. To stay robust in
 * that case, pass the *full* error signature (e.g. `UnauthorizedCaller(uint256)`)
 * and this helper will also match the computed 4-byte selector.
 *
 * @param promise        The contract call promise expected to revert.
 * @param reasonOrSig    Error name (`InvalidBuyer`) or full signature
 *                       (`UnauthorizedCaller(uint256)`) expected in the revert.
 */
export async function expectRevert(promise: Promise<unknown>, reasonOrSig: string): Promise<void> {
  const name = reasonOrSig.includes('(') ? reasonOrSig.slice(0, reasonOrSig.indexOf('(')) : reasonOrSig;
  const selector = reasonOrSig.includes('(')
    ? keccak256(toHex(reasonOrSig)).slice(0, 10)
    : undefined;

  try {
    await promise;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const matched = message.includes(name) || (selector !== undefined && message.includes(selector));
    expect(
      matched,
      `expected revert matching "${reasonOrSig}"${selector ? ` (selector ${selector})` : ''} but got:\n${message}`,
    ).to.equal(true);
    return;
  }
  throw new Error(`Expected revert matching "${reasonOrSig}" but the call succeeded`);
}
