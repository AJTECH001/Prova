import { container } from '../../../src/infrastructure/container.js';
import { createGetHandler } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

// Risk proofs expire after 15 minutes — prevents stale scores being reused
const PROOF_TTL_SECONDS = 15 * 60;

const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

const handler = createGetHandler({
  operationName: 'GetCreditScore',
  execute: async (req) => {
    const buyerAddress = req.query.buyerAddress as string;

    if (!buyerAddress || !ETH_ADDRESS_REGEX.test(buyerAddress)) {
      return Response.badRequest('Invalid buyer address', 'Must be a valid Ethereum address (0x...)');
    }

    // Look up the buyer's internal userId from their wallet address.
    // If they haven't registered yet, use an empty string — the use case
    // returns a neutral score of 500 when no escrow history exists.
    const buyer = await container.userRepo.findByWalletAddress(buyerAddress);
    const userId = buyer?.id ?? '';

    const result = await container.computeCreditScoreUseCase.execute(userId, buyerAddress);

    return Response.ok({
      buyer_address: buyerAddress,
      raw_score: result.rawScore,
      risk_proof: result.riskProof,
      expires_at: Math.floor(Date.now() / 1000) + PROOF_TTL_SECONDS,
    });
  },
});

export default withCors(withAuth(handler));
