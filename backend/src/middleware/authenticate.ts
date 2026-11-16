import type { NextFunction, Request, Response } from 'express';
import { USER_ACTIVITY_HEADER, type SessionUser } from '@app/shared';
import { setAuthCookie, signToken, verifyToken } from '../auth/token';
import { findActiveUserById } from '../auth/users.queries';
import { AUTH_COOKIE_NAME, TOKEN_RENEW_AFTER_MS } from '../config/constants';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Ustawia req.user z ciasteczka i z bazy: konto w archiwum albo usunięte = niezalogowany, rola zawsze aktualna.
 * Nigdy nie odrzuca żądania; od tego są requireAuth i requireRole. Token starszy niż minuta odnawia tylko przy
 * żądaniu po czynności człowieka (nagłówek USER_ACTIVITY_HEADER), więc odświeżanie w tle nie przedłuża sesji.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  req.user = undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = typeof token === 'string' ? verifyToken(token) : null;
  if (!payload) return next();
  try {
    const user = await findActiveUserById(payload.id, payload.tokenVersion);
    if (!user) return next();
    req.user = user;
    if (req.get(USER_ACTIVITY_HEADER) === '1' && Date.now() - payload.issuedAtMs > TOKEN_RENEW_AFTER_MS) {
      setAuthCookie(res, signToken(user, payload.tokenVersion));
    }
    next();
  } catch (error) {
    next(error);
  }
}
