import { z } from 'zod';
import { ReportFundedEscrowUseCase } from '../../../../src/application/use-case/transaction/report-funded-escrow.use-case.js';
import { container } from '../../../../src/infrastructure/container.js';
import { createHandler } from '../../../../src/interface/handler-factory.js';
import { withAuth } from '../../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../../src/interface/response.js';

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
