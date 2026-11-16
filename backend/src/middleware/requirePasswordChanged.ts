import type { NextFunction, Request, Response } from 'express';
import { SERVER_MESSAGES } from '@app/shared';
import { sendError } from './errors';

/**
 * Osoba z hasłem tymczasowym nie dostanie żadnych danych, dopóki nie ustawi własnego hasła (front przenosi ją wtedy
 * na /change-password). W app.ts za trasami logowania (me, change-password), przed modułami.
 */
export const requirePasswordChanged = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.mustChangePassword) return sendError(res, 403, SERVER_MESSAGES.passwordChangeRequired);
  next();
};
