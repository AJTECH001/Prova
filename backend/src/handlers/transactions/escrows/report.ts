import { ReportEscrowTransactionDtoSchema } from '../../../application/dto/transaction/report-transaction.dto.js';
import { ReportEscrowTransactionUseCase } from '../../../application/use-case/transaction/report-escrow-transaction.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withAuth } from '../../../interface/middleware/with-auth.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const useCase = new ReportEscrowTransactionUseCase(container.escrowRepo, container.escrowEventRepo);

const handler = createHandler({
  operationName: 'ReportEscrowTransaction',
  schema: ReportEscrowTransactionDtoSchema,
  execute: async (dto, _req, authPayload) => {
    const result = await useCase.execute(dto, authPayload!.userId);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
