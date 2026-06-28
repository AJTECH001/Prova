import hre from 'hardhat';
import { encodeFunctionData, type Address, type Abi } from 'viem';

/**
 * Deploy a UUPS upgradeable contract behind an ERC1967 proxy and return a
 * viem contract instance bound to the proxy address.
 *
 * The protocol contracts call `_disableInitializers()` in their constructors,
 * so they can only be exercised through a proxy whose `initialize(...)` runs
 * against the proxy's own storage. This helper mirrors the production deploy
 * flow (deploy implementation → deploy ERC1967Proxy with init calldata).
 *
 * @param contractName   Name of the implementation contract (must be compiled).
 * @param initializerFn  Name of the initializer function (e.g. "initialize").
 * @param initializerArgs Arguments passed to the initializer.
 */
export async function deployBehindProxy<TAbi extends Abi>(
  contractName: string,
  initializerFn: string,
  initializerArgs: readonly unknown[],
) {
  const implementation = await hre.viem.deployContract(contractName as never);

  const initData = encodeFunctionData({
    abi: implementation.abi as TAbi,
    functionName: initializerFn as never,
    args: initializerArgs as never,
  });

  const proxy = await hre.viem.deployContract('ERC1967Proxy', [
    implementation.address,
    initData,
  ]);

  return hre.viem.getContractAt(
    contractName as never,
    proxy.address as Address,
  );
}
