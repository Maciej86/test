import type { NextFunction, Request, Response } from 'express';
import type { SessionUser } from '@app/shared';
import { verifyToken } from '../auth/token';
import { AUTH_COOKIE_NAME } from '../config/constants';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Ustawia req.user z ciasteczka. Nigdy nie odrzuca żądania; od tego są requireAuth i requireRole. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  req.user = typeof token === 'string' ? (verifyToken(token) ?? undefined) : undefined;
  next();
}
