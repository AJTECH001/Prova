import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StakeDtoSchema } from '../../application/dto/pool/stake.dto.js';
import { StakeUseCase } from '../../application/use-case/pool/stake.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const stakeUseCase = new StakeUseCase(container.poolStakeRepo);

const postHandler = createHandler({
  operationName: 'Stake',
  schema: StakeDtoSchema,
  execute: async (dto, _req, authPayload) => {
    const result = await stakeUseCase.execute(dto, authPayload!.userId);
    return Response.created(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
