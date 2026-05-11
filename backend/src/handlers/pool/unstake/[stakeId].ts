import type { VercelRequest, VercelResponse } from '@vercel/node';
import { UnstakeUseCase } from '../../../application/use-case/pool/unstake.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createGetHandler, sendResponse } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const unstakeUseCase = new UnstakeUseCase(container.poolStakeRepo);

const postHandler = createGetHandler({
  operationName: 'Unstake',
  execute: async (req, authPayload) => {
    const stakeId = req.query.stakeId as string;
    const result = await unstakeUseCase.execute(stakeId, authPayload!.userId);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
