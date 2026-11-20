import rateLimit from 'express-rate-limit';
import { SERVER_MESSAGES } from '@app/shared';
import { LOGIN_RATE_LIMIT, PASSWORD_CHANGE_RATE_LIMIT } from '../config/constants';

/** Ochrona logowania przed zgadywaniem haseł. */
export const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT.windowMs,
  limit: LOGIN_RATE_LIMIT.max,
  // Udane logowania się nie liczą: limit dotyczy tylko błędnych prób.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: SERVER_MESSAGES.tooManyLogins } },
});

/**
 * Ochrona zmiany własnego hasła przed zgadywaniem obecnego (np. przy cudzym, niezablokowanym komputerze). Liczy na
 * konto, nie na adres IP: osoby z jednego biura nie blokują się nawzajem. Za `requireAuth`, więc `req.user` jest.
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: PASSWORD_CHANGE_RATE_LIMIT.windowMs,
  limit: PASSWORD_CHANGE_RATE_LIMIT.max,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user!.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: SERVER_MESSAGES.tooManyPasswordTries } },
});
