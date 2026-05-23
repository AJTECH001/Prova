import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const CCM_ADDRESS = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';
const CCM_ABI = parseAbi([
  'function poolFactory() view returns (address)',
  'function escrow() view returns (address)'
]);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const factory = await client.readContract({
    address: CCM_ADDRESS,
    abi: CCM_ABI,
    functionName: 'poolFactory',
  });

  const escrow = await client.readContract({
    address: CCM_ADDRESS,
    abi: CCM_ABI,
    functionName: 'escrow',
  });

  console.log('CCM Factory:', factory);
  console.log('CCM Escrow:', escrow);
}

main().catch(console.error);
