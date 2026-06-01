import { SiweMessage } from 'siwe';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, arbitrum, mainnet, optimism } from 'viem/chains';
import type { Chain } from 'viem';
import { getEnv } from '../../core/config.js';
import { getLogger } from '../../core/logger.js';

const logger = getLogger('SiweVerifier');

const CHAIN_BY_ID: Record<number, Chain> = {
  1:      mainnet,
  10:     optimism,
  42161:  arbitrum,
  421614: arbitrumSepolia,
};

function getChain(chainId: number): Chain {
  const chain = CHAIN_BY_ID[chainId];
  if (!chain) {
    logger.warn({ chainId }, 'Unknown chainId — falling back to arbitrumSepolia');
    return arbitrumSepolia;
  }
  return chain;
}

export class SiweVerifier {
  async verify(message: string, signature: string): Promise<{ address: string; valid: boolean }> {
    try {
      const siweMessage = new SiweMessage(message);
      const address = siweMessage.address as `0x${string}`;

      logger.info({ address, nonce: siweMessage.nonce }, 'Verifying SIWE signature');

      const env = getEnv();
      const rpcUrl = env.RPC_URL || undefined;
      if (!rpcUrl) {
        logger.warn('RPC_URL not set, ERC-6492 verification will fail for smart accounts');
      }

      const publicClient = createPublicClient({
        chain: getChain(env.CHAIN_ID),
        transport: http(rpcUrl),
      });

      const valid = await publicClient.verifyMessage({
        address,
        message,
        signature: signature as `0x${string}`,
      });

      logger.info({ address, valid }, 'SIWE verification result');
      return { address: siweMessage.address, valid };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, 'SIWE verification failed');
      return { address: '', valid: false };
    }
  }
}
