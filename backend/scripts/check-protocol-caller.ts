import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const POLICY_ADDRESS = '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';
const CCM_ADDRESS = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

const ABI = parseAbi(['function protocolCaller() view returns (address)']);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  const caller = await client.readContract({
    address: POLICY_ADDRESS as `0x\${string}`,
    abi: ABI,
    functionName: 'protocolCaller',
  });

  console.log('Policy protocolCaller:', caller);
  console.log('Expected CCM:', CCM_ADDRESS);
  console.log('Match:', caller.toLowerCase() === CCM_ADDRESS.toLowerCase());
}

main().catch(console.error);
