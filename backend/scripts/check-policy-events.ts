import { createPublicClient, http, parseAbiItem } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const POLICY_ADDRESS = '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const logs = await client.getLogs({
    address: POLICY_ADDRESS,
    event: parseAbiItem('event PolicySet(uint256 indexed coverageId)'),
    args: {
      coverageId: BigInt(59)
    },
    fromBlock: 0n,
  });

  console.log('PolicySet events for 59:', logs.length);
  if (logs.length > 0) {
    console.log('First event tx:', logs[0].transactionHash);
  }
}

main().catch(console.error);
