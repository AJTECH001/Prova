import { getEnv } from '../../../core/config.js';
import type { AddPolicyResponse } from '../../dto/pool/pool-response.dto.js';

const ADD_POLICY_ABI_SIG = 'addPolicy(address)';

export class AddPolicyUseCase {
  async execute(policyAddress: string): Promise<AddPolicyResponse> {
    const env = getEnv();
    const poolAddress = env.POOL_ADDRESS ?? '';

    return {
      call: {
        contract_address: poolAddress,
        abi_function_signature: ADD_POLICY_ABI_SIG,
        abi_parameters: {
          policy_address: policyAddress,
        },
      },
    };
  }
}
