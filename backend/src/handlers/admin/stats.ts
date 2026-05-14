import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetPlatformStatsUseCase } from '../../application/use-case/admin/get-platform-stats.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const getPlatformStatsUseCase = new GetPlatformStatsUseCase(container.escrowRepo);

const getHandler = createGetHandler({
  operationName: 'AdminGetStats',
  execute: async (req, authPayload) => {
    if (authPayload?.role !== 'ADMIN') {
      return Response.forbidden('Admin access required');
    }

    const result = await getPlatformStatsUseCase.execute();
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
