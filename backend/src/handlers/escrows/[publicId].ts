import { GetEscrowByIdUseCase } from '../../application/use-case/escrow/get-escrow-by-id.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetEscrowByIdUseCase(container.escrowRepo);

const handler = createGetHandler({
  operationName: 'GetEscrowById',
  execute: async (req, authPayload) => {
    const publicId = req.query.publicId as string;
    const result = await useCase.execute(publicId, authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
