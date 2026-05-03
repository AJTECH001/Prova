import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConfirmStakeUseCase } from '../../../../src/application/use-case/pool/confirm-stake.use-case.js';
import { container } from '../../../../src/infrastructure/container.js';
import { sendResponse } from '../../../../src/interface/handler-factory.js';
import { withAuth } from '../../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../../src/interface/response.js';
import type { AuthenticatedRequest } from '../../../../src/interface/handler-factory.js';

const confirmStakeUseCase = new ConfirmStakeUseCase(container.poolStakeRepo);

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendResponse(res, Response.badRequest('Method not allowed'));
    return;
  }

  const authPayload = (req as AuthenticatedRequest).authPayload;
  const publicId = req.query['publicId'] as string;
  const txHash = req.body?.tx_hash as string | undefined;
  const onChainStakeId = req.body?.on_chain_stake_id as string | undefined;

  try {
    await confirmStakeUseCase.execute(publicId, authPayload!.userId, txHash, onChainStakeId);
    sendResponse(res, Response.ok({ confirmed: true }));
  } catch (e: any) {
    sendResponse(res, Response.fromError(e));
  }
};

export default withCors(withAuth(handler));
