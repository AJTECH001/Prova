import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkLiveness } from '../../infrastructure/health/health.service.js';

/** Liveness probe — cheap, dependency-free. Always 200 while the process is up. */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(200).json(checkLiveness());
}
