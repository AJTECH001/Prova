import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FileClaimDtoSchema } from '../../application/dto/dispute/file-claim.dto.js';
import { FileClaimUseCase } from '../../application/use-case/dispute/file-claim.use-case.js';
import { GetClaimsUseCase } from '../../application/use-case/dispute/get-claims.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { withRole } from '../../interface/middleware/with-role.js';
import { Response } from '../../interface/response.js';

const fileClaimUseCase = new FileClaimUseCase(container.escrowRepo, container.disputeRepo);
const getClaimsUseCase = new GetClaimsUseCase(container.disputeRepo);

// Only sellers file claims (they are the covered party for buyer non-payment).
// authPayload is populated by the outer withAuth wrapper before this runs.
const postHandler = withRole('SELLER')(
  createHandler({
    operationName: 'FileClaim',
    schema: FileClaimDtoSchema,
    execute: async (dto, _req, authPayload) => {
      const result = await fileClaimUseCase.execute(dto, authPayload!.userId, authPayload!.walletAddress);
      return Response.created(result);
    },
  }),
);

const getHandler = createGetHandler({
  operationName: 'GetClaims',
  execute: async (req, authPayload) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const cursor = req.query.continuation_token as string | undefined;
    const status = req.query.status as string | undefined;
    const result = await getClaimsUseCase.execute(authPayload!.userId, { limit, cursor, status });
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') {
    return postHandler(req, res);
  }
  if (req.method === 'GET') {
    return getHandler(req, res);
  }
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
