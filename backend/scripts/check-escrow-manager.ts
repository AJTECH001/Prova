import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const ESCROW_ADDRESS = '0xbe1eEB78504B71beEE1b33D3E3D367A2F9a549A6';
const EXPECTED_CCM = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

const ABI = parseAbi(['function insuranceManager() view returns (address)']);

async function main() {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
  });

  try {
    const manager = await client.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: 'insuranceManager',
    });

    console.log('Escrow insuranceManager:', manager);
    console.log('Expected CCM:', EXPECTED_CCM);
    console.log('Match:', manager.toLowerCase() === EXPECTED_CCM.toLowerCase());
  } catch (e) {
    console.error('Failed to read insuranceManager from Escrow:', e instanceof Error ? e.message : e);
  }
}

main().catch(console.error);
