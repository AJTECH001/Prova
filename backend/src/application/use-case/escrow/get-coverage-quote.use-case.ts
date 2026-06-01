import { ApplicationHttpError } from '../../../core/errors.js';
import type { IEscrowRepository } from '../../../domain/escrow/repository/escrow.repository.js';
import type { IUserRepository } from '../../../domain/auth/repository/user.repository.js';
import type { ComputeCreditScoreUseCase } from '../credit-score/compute-credit-score.use-case.js';

// Mirror of RiskMathLib.sol — must stay in sync with the deployed contract curve.
// Thresholds descending; first bucket where score >= threshold wins.
const THRESHOLDS = [800, 720, 650, 580, 500, 0] as const;
const PREMIUMS_BPS = [150, 200, 280, 400, 600, 1000] as const;
const DEFAULT_COVERAGE_DAYS = 90;

function lookupPremiumBps(score: number): number {
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (score >= THRESHOLDS[i]) return PREMIUMS_BPS[i];
  }
  return PREMIUMS_BPS[PREMIUMS_BPS.length - 1];
}

export interface CoverageQuoteResponse {
  escrow_public_id: string;
  invoice_amount: number;
  coverage_amount: number;
  risk_score: number;
  premium_rate_bps: number;
  premium_rate_pct: string;
  premium_cost: number;
  expiry_ts: number;
}

export class GetCoverageQuoteUseCase {
  constructor(
    private readonly escrowRepository: IEscrowRepository,
    private readonly userRepository: IUserRepository,
    private readonly computeCreditScore: ComputeCreditScoreUseCase,
  ) {}

  async execute(escrowPublicId: string, requestingUserId: string): Promise<CoverageQuoteResponse> {
    const escrow = await this.escrowRepository.findByPublicId(escrowPublicId);
    if (!escrow) throw new ApplicationHttpError(404, 'Escrow not found');
    if (escrow.userId !== requestingUserId) throw new ApplicationHttpError(403, 'Unauthorized');
    if (!escrow.onChainEscrowId) {
      throw new ApplicationHttpError(422, 'Escrow is not yet on-chain');
    }
    if (escrow.coverageId) {
      throw new ApplicationHttpError(409, 'Coverage already purchased for this escrow');
    }

    const buyerAddress = escrow.counterparty ?? '';
    let buyerUserId = '';
    if (buyerAddress) {
      const buyer = await this.userRepository.findByWalletAddress(buyerAddress);
      buyerUserId = buyer?.id ?? '';
    }

    // execute() always returns rawScore — FHE encryption has a graceful fallback
    const { rawScore } = await this.computeCreditScore.execute(buyerUserId, buyerAddress);

    const premiumBps = lookupPremiumBps(rawScore);
    const coverageAmount = escrow.amount;
    const premiumCost = Math.round((coverageAmount * premiumBps) / 100) / 100;
    const expiryTs = Math.floor(Date.now() / 1000) + DEFAULT_COVERAGE_DAYS * 24 * 60 * 60;

    return {
      escrow_public_id: escrowPublicId,
      invoice_amount: escrow.amount,
      coverage_amount: coverageAmount,
      risk_score: rawScore,
      premium_rate_bps: premiumBps,
      premium_rate_pct: (premiumBps / 100).toFixed(2),
      premium_cost: premiumCost,
      expiry_ts: expiryTs,
    };
  }
}
