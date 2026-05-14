import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetAllEscrowsUseCase } from '../../application/use-case/admin/get-all-escrows.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const getAllEscrowsUseCase = new GetAllEscrowsUseCase(container.escrowRepo);

const getHandler = createGetHandler({
  operationName: 'AdminGetEscrows',
  execute: async (req, authPayload) => {
    if (authPayload?.role !== 'ADMIN') {
      return Response.forbidden('Admin access required');
    }

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const cursor = req.query.continuation_token as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await getAllEscrowsUseCase.execute({
      limit,
      cursor,
      status,
    });
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
