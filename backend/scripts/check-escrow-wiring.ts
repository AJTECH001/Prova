import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const ESCROW_ADDRESS = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';
const ESCROW_ID = 59; // 0x3b

const ESCROW_ABI = parseAbi([
  'function getResolver(uint256 escrowId) view returns (address)'
]);

const RESOLVER_ABI = parseAbi([
  'function escrowContract() view returns (address)'
]);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const resolver = await client.readContract({
    address: ESCROW_ADDRESS as `0x\${string}`,
    abi: ESCROW_ABI,
    functionName: 'getResolver',
    args: [BigInt(ESCROW_ID)],
  });

  console.log('Escrow Resolver:', resolver);

  const escrowOnResolver = await client.readContract({
    address: resolver as `0x\${string}`,
    abi: RESOLVER_ABI,
    functionName: 'escrowContract',
  });

  console.log('Escrow on Resolver:', escrowOnResolver);
  console.log('Match:', escrowOnResolver.toLowerCase() === ESCROW_ADDRESS.toLowerCase());
}

main().catch(console.error);
