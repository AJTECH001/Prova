import { createPublicClient, http, formatUnits } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { getEnv } from '../../../core/config.js';
import type { BalanceResponse } from '../../dto/balance/balance-response.dto.js';

const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const USDC_DECIMALS = 6;

export class GetBalanceUseCase {
  async execute(walletAddress: string): Promise<BalanceResponse> {
    const env = getEnv();
    const usdcAddress = (env.USDC_ADDRESS ?? '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d') as `0x${string}`;

    try {
      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(env.RPC_URL || undefined),
      });

      const raw = await client.readContract({
        address: usdcAddress,
        abi: ERC20_BALANCE_OF_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      const formatted = formatUnits(raw, USDC_DECIMALS);

      return {
        wallet_address: walletAddress,
        balance: raw.toString(),
        formatted_balance: parseFloat(formatted).toFixed(2),
        currency: 'USDC',
        chain_id: env.CHAIN_ID,
      };
    } catch {
      return {
        wallet_address: walletAddress,
        balance: '0',
        formatted_balance: '0.00',
        currency: 'USDC',
        chain_id: env.CHAIN_ID,
      };
    }
  }
}
