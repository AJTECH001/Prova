import type { VercelResponse } from '@vercel/node';
import type { UserRole } from '../../domain/auth/model/user.js';
import type { AuthenticatedRequest, VercelHandler } from '../handler-factory.js';
import { Response } from '../response.js';
import { sendResponse } from '../handler-factory.js';

export function withRole(...roles: UserRole[]): (handler: VercelHandler) => VercelHandler {
  return (handler) => async (req, res: VercelResponse) => {
    const payload = (req as AuthenticatedRequest).authPayload;
    if (!payload?.role || !roles.includes(payload.role)) {
      sendResponse(res, Response.forbidden('Insufficient permissions', `Required role: ${roles.join(' or ')}`));
      return;
    }
    return handler(req, res);
  };
}
