import rateLimit from 'express-rate-limit';
import { SERVER_MESSAGES } from '@app/shared';
import { LOGIN_RATE_LIMIT } from '../config/constants';

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
