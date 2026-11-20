import { z } from 'zod';
import type { Role } from '../constants/roles';
import { email, optionalField, passwordInput, withRepeatPassword } from './fields';

/** „E-mail do powiadomień” na ekranie Moje konto; puste = brak e-maili. */
export const myAccountEmailSchema = z.object({ email: optionalField(email) });
export type MyAccountEmailInput = z.infer<typeof myAccountEmailSchema>;

/** Zmiana własnego hasła: obecne + nowe dwa razy. */
export const myAccountPasswordSchema = withRepeatPassword({ currentPassword: passwordInput });
export type MyAccountPasswordInput = z.infer<typeof myAccountPasswordSchema>;

/** Dane zalogowanej osoby na ekranie Moje konto (`GET /api/my-account`). */
export interface MyAccount {
  name: string;
  login: string;
  role: Role;
  email: string | null;
  /** RRRR-MM-DD albo null. */
  hiredOn: string | null;
  /** Nazwa typu umowy (także ukrytego) albo null. */
  contractTypeName: string | null;
}
