import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BuyCoverageDtoSchema } from '../../../../src/application/dto/escrow/buy-coverage.dto.js';
import { BuyCoverageUseCase } from '../../../../src/application/use-case/escrow/buy-coverage.use-case.js';
import { container } from '../../../../src/infrastructure/container.js';
import { createHandler, sendResponse } from '../../../../src/interface/handler-factory.js';
import { withAuth } from '../../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../../src/interface/response.js';

const buyCoverageUseCase = new BuyCoverageUseCase(
  container.escrowRepo,
  container.computeCreditScoreUseCase,
);

const postHandler = createHandler({
  operationName: 'BuyCoverage',
  schema: BuyCoverageDtoSchema,
  execute: async (dto, req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await buyCoverageUseCase.execute(
      publicId,
      dto,
      authPayload!.userId,
      authPayload!.walletAddress,
    );
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
