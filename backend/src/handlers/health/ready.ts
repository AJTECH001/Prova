import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkReadiness } from '../../infrastructure/health/health.service.js';

/** Readiness probe — verifies critical dependencies; 503 when degraded. */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const status = await checkReadiness();
  res.status(status.status === 'ok' ? 200 : 503).json(status);
}
