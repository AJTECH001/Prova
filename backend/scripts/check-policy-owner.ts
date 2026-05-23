import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const POLICY_ADDRESS = '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';
const ABI = parseAbi(['function owner() view returns (address)']);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const owner = await client.readContract({
    address: POLICY_ADDRESS,
    abi: ABI,
    functionName: 'owner',
  });

  console.log('Policy Owner:', owner);
}

main().catch(console.error);
