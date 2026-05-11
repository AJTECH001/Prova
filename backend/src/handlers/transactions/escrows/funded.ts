import { z } from 'zod';
import { ReportFundedEscrowUseCase } from '../../../application/use-case/transaction/report-funded-escrow.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const schema = z.object({
  on_chain_id: z.string().min(1),
  tx_hash: z.string().min(1),
});

const useCase = new ReportFundedEscrowUseCase(container.escrowRepo);

const handler = createHandler({
  operationName: 'ReportFundedEscrow',
  schema,
  execute: async (dto) => {
    const result = await useCase.execute(dto);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
