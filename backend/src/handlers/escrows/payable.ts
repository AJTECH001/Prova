import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetPayableEscrowsUseCase } from '../../application/use-case/escrow/get-payable-escrows.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const getPayableEscrowsUseCase = new GetPayableEscrowsUseCase(container.escrowRepo);

const getHandler = createGetHandler({
  operationName: 'GetPayableEscrows',
  execute: async (_req, authPayload) => {
    const result = await getPayableEscrowsUseCase.execute(authPayload!.walletAddress);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
