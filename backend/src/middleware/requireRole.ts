import type { NextFunction, Request, Response } from 'express';
import { SERVER_MESSAGES, type Role } from '@app/shared';
import { sendError } from './errors';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return sendError(res, 401, SERVER_MESSAGES.loginRequired);
  next();
}

/** Każda trasa modułu ma requireRole: ukrycie pozycji w menu nie jest zabezpieczeniem. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 401, SERVER_MESSAGES.loginRequired);
    if (!roles.includes(req.user.role)) return sendError(res, 403, SERVER_MESSAGES.noAccess);
    next();
  };
}
