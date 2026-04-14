import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ProcessCoverageEventUseCase,
  type CoverageEventPayload,
} from '../../../src/application/use-case/webhook/process-coverage-event.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { sendResponse } from '../../../src/interface/handler-factory.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const useCase = new ProcessCoverageEventUseCase(container.escrowRepo);

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendResponse(res, Response.badRequest('Method not allowed'));
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const events: CoverageEventPayload[] = Array.isArray(body) ? body : (body.events ?? []);

    await useCase.execute(events);
    sendResponse(res, Response.ok({ processed: events.length }));
  } catch {
    sendResponse(res, Response.internalServerError());
  }
};

export default withCors(handler);
