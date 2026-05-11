import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AddPolicyUseCase } from '../../../application/use-case/pool/add-policy.use-case.js';
import { createGetHandler, sendResponse } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { withRole } from '../../../interface/middleware/with-role.js';
import { Response } from '../../../interface/response.js';

const addPolicyUseCase = new AddPolicyUseCase();

const postHandler = createGetHandler({
  operationName: 'AddPolicy',
  execute: async (req) => {
    const address = req.query.address as string;
    const result = await addPolicyUseCase.execute(address);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(withRole('ADMIN')(handler)));
