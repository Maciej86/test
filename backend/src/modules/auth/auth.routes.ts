import { Router } from 'express';
import { loginSchema, newPasswordSchema, SERVER_MESSAGES, type LoginInput, type NewPasswordInput } from '@app/shared';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../../auth/password';
import { clearAuthCookie, setAuthCookie, signToken } from '../../auth/token';
import { findActiveUserByLogin, findPasswordHash, updatePassword } from '../../auth/users.queries';
import { sendError } from '../../middleware/errors';
import { loginLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validateBody';

/** Trasy publiczne (bez logowania): logowanie i wylogowanie. Podpięte w app.ts przed requireAuth. */
export const authPublicRoutes = Router();

authPublicRoutes.post('/auth/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { login, password } = req.body as LoginInput;
  const account = await findActiveUserByLogin(login);
  // Bez konta i tak porównujemy hasło, żeby czas odpowiedzi nie zdradzał, czy login istnieje.
  const valid = await verifyPassword(password, account?.passwordHash ?? (await dummyPasswordHash()));
  if (!account || !valid) return sendError(res, 401, SERVER_MESSAGES.loginFailed);
  setAuthCookie(res, signToken(account.user));
  res.json({ user: account.user });
});

authPublicRoutes.post('/auth/logout', (_req, res) => { // rule-ok: wylogowanie nie przyjmuje żadnych danych
  clearAuthCookie(res);
  res.status(204).end();
});

/**
 * Trasy dla zalogowanych pod /api/auth, dostępne także z hasłem tymczasowym.
 * Podpięte w app.ts przez mountModule, przed blokadą requirePasswordChanged.
 */
export const authRoutes = Router();

authRoutes.get('/me', (req, res) => {
  res.json({ user: req.user });
});

/** Własne hasło zamiast tymczasowego. Zwykła zmiana hasła (z obecnym) jest w module „Moje konto”. */
authRoutes.post('/change-password', validateBody(newPasswordSchema), async (req, res) => {
  const user = req.user!;
  if (!user.mustChangePassword) return sendError(res, 409, SERVER_MESSAGES.passwordNotTemporary);
  const { newPassword } = req.body as NewPasswordInput;
  const currentHash = await findPasswordHash(user.id);
  if (currentHash && (await verifyPassword(newPassword, currentHash))) {
    return sendError(res, 400, SERVER_MESSAGES.invalidData, { newPassword: 'validation.password_same_as_temporary' });
  }
  await updatePassword(user.id, await hashPassword(newPassword));
  res.json({ user: { ...user, mustChangePassword: false } });
});
