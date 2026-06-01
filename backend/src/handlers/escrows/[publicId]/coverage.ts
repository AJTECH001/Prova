import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { BuyCoverageDtoSchema } from '../../../application/dto/escrow/buy-coverage.dto.js';
import { BuyCoverageUseCase } from '../../../application/use-case/escrow/buy-coverage.use-case.js';
import { ConfirmCoverageUseCase } from '../../../application/use-case/escrow/confirm-coverage.use-case.js';
import { GetCoverageQuoteUseCase } from '../../../application/use-case/escrow/get-coverage-quote.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const buyCoverageUseCase = new BuyCoverageUseCase(
  container.escrowRepo,
  container.policyAdminService,
);

const confirmCoverageUseCase = new ConfirmCoverageUseCase(container.escrowRepo);

const getCoverageQuoteUseCase = new GetCoverageQuoteUseCase(
  container.escrowRepo,
  container.userRepo,
  container.computeCreditScoreUseCase,
);

const ConfirmCoverageDtoSchema = z.object({
  coverage_id: z.string().min(1),
  tx_hash: z.string().optional(),
});

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

const patchHandler = createHandler({
  operationName: 'ConfirmCoverage',
  schema: ConfirmCoverageDtoSchema,
  execute: async (dto, req, authPayload) => {
    const publicId = req.query.publicId as string;
    await confirmCoverageUseCase.execute(publicId, dto.coverage_id, authPayload!.userId);
    return Response.ok({ confirmed: true });
  },
});

const getHandler = createGetHandler({
  operationName: 'GetCoverageQuote',
  execute: async (req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await getCoverageQuoteUseCase.execute(publicId, authPayload!.userId);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'GET')   return getHandler(req, res);
  if (req.method === 'POST')  return postHandler(req, res);
  if (req.method === 'PATCH') return patchHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
