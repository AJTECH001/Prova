import { getEnv } from '../../../core/config.js';
import type { CreatePoolDto } from '../../dto/pool/create-pool.dto.js';
import type { CreatePoolResponse } from '../../dto/pool/pool-response.dto.js';

// PoolFactory.createPool(IFHERC20 paymentToken_) — one parameter only.
// policy registration and liquidity staking are separate calls (addPolicy / stake).
const POOL_FACTORY_ABI_SIG = 'createPool(address)';

export class CreatePoolUseCase {
  async execute(_dto: CreatePoolDto): Promise<CreatePoolResponse> {
    const env = getEnv();
    const poolFactoryAddress = env.POOL_FACTORY_ADDRESS ?? '';
    const usdcAddress = env.USDC_ADDRESS ?? '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

    return {
      call: {
        contract_address: poolFactoryAddress,
        abi_function_signature: POOL_FACTORY_ABI_SIG,
        abi_parameters: {
          payment_token: usdcAddress,
        },
      },
    };
  }
}
