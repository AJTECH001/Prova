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
    // Pool payment token must be cUSDC (FHERC20 wrapper), not plain USDC
    const cUsdcAddress = env.PUSDC_WRAPPER_ADDRESS ?? '0x42E47f9bA89712C317f60A72C81A610A2b68c48a';

    return {
      call: {
        contract_address: poolFactoryAddress,
        abi_function_signature: POOL_FACTORY_ABI_SIG,
        abi_parameters: {
          payment_token: cUsdcAddress,
        },
      },
    };
  }
}
