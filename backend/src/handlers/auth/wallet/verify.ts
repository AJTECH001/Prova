import { VerifyWalletDtoSchema } from '../../../application/dto/auth/verify-wallet.dto.js';
import { VerifyWalletUseCase } from '../../../application/use-case/auth/verify-wallet.use-case.js';
import { container } from '../../../infrastructure/container.js';
import { createHandler } from '../../../interface/handler-factory.js';
import { withCors } from '../../../interface/middleware/with-cors.js';
import { Response } from '../../../interface/response.js';

const useCase = new VerifyWalletUseCase(
  container.siweVerifier,
  container.nonceService,
  container.userRepo,
  container.sessionRepo,
  container.jwtService,
);

const handler = createHandler({
  operationName: 'VerifyWallet',
  schema: VerifyWalletDtoSchema,
  execute: async (dto) => {
    const result = await useCase.execute(dto);
    return Response.ok(result);
  },
});

export default withCors(handler);
