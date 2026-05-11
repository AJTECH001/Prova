import { createHmac, timingSafeEqual } from 'node:crypto';
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

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendResponse(res, Response.badRequest('Method not allowed'));
    return;
  }

  const secret = process.env.COVERAGE_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-coverage-signature'] as string | undefined;
    if (!signature) {
      sendResponse(res, Response.unauthorized('Missing x-coverage-signature header'));
      return;
    }
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature, secret)) {
      sendResponse(res, Response.unauthorized('Invalid signature'));
      return;
    }
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
