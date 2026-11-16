import type { NextFunction, Request, Response } from 'express';
import { SERVER_MESSAGES } from '@app/shared';
import { env } from '../env';
import { sendError } from './errors';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Ochrona przed zapisem z obcej strony (CSRF): przeglądarka dołącza nagłówek Origin do każdego POST, PUT, PATCH
 * i DELETE, więc zapis z innego adresu niż FRONTEND_URL dostaje 403. Żądania bez Origin (curl, testy, webhooki)
 * przechodzą, bo nie wysyła ich przeglądarka zalogowanej osoby. Razem z ciasteczkiem SameSite=Lax.
 */
export function sameOrigin(req: Request, res: Response, next: NextFunction) {
  if (READ_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== new URL(env.FRONTEND_URL).origin) return sendError(res, 403, SERVER_MESSAGES.noAccess);
  next();
}
