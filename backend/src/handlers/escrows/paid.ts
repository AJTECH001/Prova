import { GetPaidEscrowsUseCase } from '../../application/use-case/escrow/get-paid-escrows.use-case.js';
import { container } from '../../infrastructure/container.js';
import { createGetHandler } from '../../interface/handler-factory.js';
import { withAuth } from '../../interface/middleware/with-auth.js';
import { withCors } from '../../interface/middleware/with-cors.js';
import { Response } from '../../interface/response.js';

const useCase = new GetPaidEscrowsUseCase(container.escrowRepo);

const handler = createGetHandler({
  operationName: 'GetPaidEscrows',
  execute: async (_req, authPayload) => {
    const result = await useCase.execute(authPayload!.walletAddress);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
