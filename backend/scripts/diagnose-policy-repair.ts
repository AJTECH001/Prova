import { createPublicClient, http, parseAbi } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const POLICY_ADDRESS = '0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5';
const CCM_ADDRESS = '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

const ABI = parseAbi([
  'function owner() view returns (address)',
  'function protocolCaller() view returns (address)'
]);

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
  const adminKey = process.env.ADMIN_PRIVATE_KEY;

  if (!adminKey) {
    console.error('ADMIN_PRIVATE_KEY not found in process.env');
    return;
  }

  const account = privateKeyToAccount(adminKey as `0x${string}`);
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const [owner, caller] = await Promise.all([
    client.readContract({ address: POLICY_ADDRESS as `0x${string}`, abi: ABI, functionName: 'owner' }),
    client.readContract({ address: POLICY_ADDRESS as `0x${string}`, abi: ABI, functionName: 'protocolCaller' }),
  ]);

  console.log('--- Policy Status ---');
  console.log('Policy Address:', POLICY_ADDRESS);
  console.log('Current Owner:', owner);
  console.log('Admin Address:', account.address);
  console.log('Is Admin Owner:', owner.toLowerCase() === account.address.toLowerCase());
  console.log('Current Protocol Caller:', caller);
  console.log('Expected CCM:', CCM_ADDRESS);
  console.log('Match:', caller.toLowerCase() === CCM_ADDRESS.toLowerCase());
}

main().catch(console.error);
