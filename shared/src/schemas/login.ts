import { z } from 'zod';
import { FIRST_NAME_MAX, LAST_NAME_MAX } from '../constants/login';
import { email, login, loginInput, newPassword, optionalField, passwordInput, personName, withRepeatPassword } from './fields';

/** Formularz logowania (ekran /login i POST /api/auth/login). */
export const loginSchema = z.object({ login: loginInput, password: passwordInput });
export type LoginInput = z.infer<typeof loginSchema>;

/** Ustawienie własnego hasła zamiast tymczasowego (ekran /change-password i POST /api/auth/change-password). */
export const newPasswordSchema = withRepeatPassword({});
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/** Konto pierwszego administratora (npm run admin). */
export const adminAccountSchema = z.object({
  firstName: personName(FIRST_NAME_MAX),
  lastName: personName(LAST_NAME_MAX),
  login,
  email: optionalField(email),
  password: newPassword,
});
export type AdminAccountInput = z.infer<typeof adminAccountSchema>;
