import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConfirmUnstakeUseCase } from '../../../../src/application/use-case/pool/confirm-unstake.use-case.js';
import { container } from '../../../../src/infrastructure/container.js';
import { sendResponse } from '../../../../src/interface/handler-factory.js';
import { withAuth } from '../../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../../src/interface/response.js';
import type { AuthenticatedRequest } from '../../../../src/interface/handler-factory.js';

const confirmUnstakeUseCase = new ConfirmUnstakeUseCase(container.poolStakeRepo);

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendResponse(res, Response.badRequest('Method not allowed'));
    return;
  }

  const authPayload = (req as AuthenticatedRequest).authPayload;
  const publicId = req.query['publicId'] as string;

  try {
    await confirmUnstakeUseCase.execute(publicId, authPayload!.userId);
    sendResponse(res, Response.ok({ withdrawn: true }));
  } catch (e: any) {
    sendResponse(res, Response.fromError(e));
  }
};

export default withCors(withAuth(handler));
