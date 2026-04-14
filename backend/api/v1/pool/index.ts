import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetPoolStatusUseCase } from '../../../src/application/use-case/pool/get-pool-status.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const getPoolStatusUseCase = new GetPoolStatusUseCase(container.poolStakeRepo);

const getHandler = createGetHandler({
  operationName: 'GetPoolStatus',
  execute: async () => {
    const result = await getPoolStatusUseCase.execute();
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'GET') {
    return getHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
