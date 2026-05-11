import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreatePoolDtoSchema } from '../../application/dto/pool/create-pool.dto.js';
import { CreatePoolUseCase } from '../../application/use-case/pool/create-pool.use-case.js';
import { createHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { withRole } from '../../interface/middleware/with-role.js';
import { Response } from '../../interface/response.js';

const createPoolUseCase = new CreatePoolUseCase();

const postHandler = createHandler({
  operationName: 'CreatePool',
  schema: CreatePoolDtoSchema,
  execute: async (dto) => {
    const result = await createPoolUseCase.execute(dto);
    return Response.created(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(withRole('ADMIN')(handler)));
