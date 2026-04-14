import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreateBusinessProfileDtoSchema } from '../../../src/application/dto/business-profile/create-business-profile.dto.js';
import { CreateBusinessProfileUseCase } from '../../../src/application/use-case/business-profile/create-business-profile.use-case.js';
import { GetBusinessProfileUseCase } from '../../../src/application/use-case/business-profile/get-business-profile.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const createUseCase = new CreateBusinessProfileUseCase(container.businessProfileRepo);
const getUseCase = new GetBusinessProfileUseCase(container.businessProfileRepo);

const postHandler = createHandler({
  operationName: 'CreateBusinessProfile',
  schema: CreateBusinessProfileDtoSchema,
  execute: async (dto, _req, authPayload) => {
    const result = await createUseCase.execute(dto, authPayload!.userId);
    return Response.created(result);
  },
});

const getHandler = createGetHandler({
  operationName: 'GetBusinessProfile',
  execute: async (_req, authPayload) => {
    const result = await getUseCase.execute(authPayload!.userId);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
