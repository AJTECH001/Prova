import { ApplicationHttpError } from '../../../core/errors.js';
import { getEnv } from '../../../core/config.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { ComputeCreditScoreUseCase } from '../credit-score/compute-credit-score.use-case.js';
import type { BuyCoverageDto, BuyCoverageResponse } from '../../dto/escrow/buy-coverage.dto.js';

// purchaseCoverage(InEaddress holder, address pool, address policy, uint256 escrowId,
//                  InEuint64 coverageAmount, uint256 expiry, bytes policyData, bytes riskProof)
const ABI_FUNCTION_SIGNATURE =
  'purchaseCoverage((uint256,uint8,uint8,bytes),address,address,uint256,(uint256,uint8,uint8,bytes),uint256,bytes,bytes)';

const USDC_DECIMALS = 6;
const DEFAULT_COVERAGE_DAYS = 90;

export class BuyCoverageUseCase {
  constructor(
    private readonly escrowRepository: IEscrowRepository,
    private readonly computeCreditScoreUseCase: ComputeCreditScoreUseCase,
  ) {}

  async execute(
    escrowPublicId: string,
    dto: BuyCoverageDto,
    userId: string,
    walletAddress: string,
  ): Promise<BuyCoverageResponse> {
    const escrow = await this.escrowRepository.findByPublicId(escrowPublicId);
    if (!escrow) {
      throw new ApplicationHttpError(404, 'Escrow not found');
    }
    if (escrow.userId !== userId) {
      throw new ApplicationHttpError(403, 'Unauthorized');
    }
    if (!escrow.onChainEscrowId) {
      throw new ApplicationHttpError(422, 'Escrow is not yet on-chain — wait for EscrowCreated event');
    }
    if (escrow.coverageId) {
      throw new ApplicationHttpError(409, 'Coverage already purchased for this escrow');
    }

    const env = getEnv();
    const poolAddress = dto.pool_address ?? escrow.poolAddress ?? env.POOL_ADDRESS ?? '';
    const policyAddress = escrow.policyAddress ?? env.POLICY_ADDRESS ?? '';

    if (!poolAddress) throw new ApplicationHttpError(422, 'pool_address is required (or set POOL_ADDRESS env var)');
    if (!policyAddress) throw new ApplicationHttpError(422, 'POLICY_ADDRESS not configured');

    const coverageAmount = dto.coverage_amount ?? escrow.amount;
    const coverageAmountSmallest = BigInt(Math.round(coverageAmount * 10 ** USDC_DECIMALS));

    // Expiry: provided date or default 90 days from now
    const expiryTimestamp = dto.expiry
      ? Math.floor(new Date(dto.expiry + 'T00:00:00Z').getTime() / 1000)
      : Math.floor(Date.now() / 1000) + DEFAULT_COVERAGE_DAYS * 24 * 60 * 60;

    // Compute buyer's credit score (risk proof) encrypted to the buyer's wallet (counterparty)
    const buyerWallet = escrow.counterparty ?? walletAddress;
    const scoreResult = await this.computeCreditScoreUseCase.execute(userId, buyerWallet);

    // ConfidentialCoverageManager is a Reineira core contract — address is fixed per network
    const coverageManagerAddress = env.COVERAGE_MANAGER_ADDRESS ?? '0x40A3A53d54D25cF079Bc9C2033224159d4EA3A67';

    return {
      escrow_on_chain_id: escrow.onChainEscrowId,
      pool_address: poolAddress,
      policy_address: policyAddress,
      coverage_amount_smallest_unit: coverageAmountSmallest.toString(),
      expiry: expiryTimestamp,
      risk_proof: scoreResult.riskProof,
      contract_address: coverageManagerAddress,
      abi_function_signature: ABI_FUNCTION_SIGNATURE,
    };
  }
}
