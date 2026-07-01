import { GetClaimUseCase } from '../../application/use-case/dispute/get-claim.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetClaimUseCase(container.disputeRepo);

const handler = createGetHandler({
  operationName: 'GetClaimById',
  execute: async (req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await useCase.execute(publicId, authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
