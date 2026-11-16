import { describe, expect, it } from 'vitest';
import { login, newPassword } from '../fields';
import { adminAccountSchema, loginSchema, newPasswordSchema } from '../login';

const firstError = (r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  r.error?.issues[0];

describe('login schemas', () => {
  it('login field accepts 3 and 190 characters and rejects 2 and 191', () => {
    expect(login.safeParse('abc').success).toBe(true);
    expect(login.safeParse('a'.repeat(190)).success).toBe(true);
    expect(firstError(login.safeParse('ab'))?.message).toBe('validation.too_short');
    expect(firstError(login.safeParse('a'.repeat(191)))?.message).toBe('validation.too_long');
  });

  it('login field rejects a space inside', () => {
    expect(firstError(login.safeParse('jan kowalski'))?.message).toBe('validation.login_format');
  });

  it('login field trims and lowercases "Jan.Kowalski@Firma.pl "', () => {
    expect(login.parse('Jan.Kowalski@Firma.pl ')).toBe('jan.kowalski@firma.pl');
    expect(loginSchema.parse({ login: ' JAN.KOWALSKI@FIRMA.PL ', password: 'x' }).login).toBe('jan.kowalski@firma.pl');
  });

  it('newPassword accepts 8 and 72 characters and rejects 7 and 73', () => {
    expect(newPassword.safeParse('Urlop-26').success).toBe(true);
    expect(newPassword.safeParse('1-' + 'a'.repeat(70)).success).toBe(true);
    expect(firstError(newPassword.safeParse('Urlo-26'))?.message).toBe('validation.password_rules');
    expect(firstError(newPassword.safeParse('1-' + 'a'.repeat(71)))?.message).toBe('validation.too_long');
  });

  it('newPassword requires a digit and a special character', () => {
    expect(firstError(newPassword.safeParse('Urlop2026'))?.message).toBe('validation.password_rules');
    expect(firstError(newPassword.safeParse('Urlop-urlop'))?.message).toBe('validation.password_rules');
    expect(newPassword.safeParse('Urlop-2026').success).toBe(true);
  });

  it('newPassword keeps spaces and Polish letters unchanged', () => {
    expect(newPassword.parse(' Zażółć-1 ')).toBe(' Zażółć-1 ');
    expect(loginSchema.parse({ login: 'abc', password: ' hasło ' }).password).toBe(' hasło ');
  });

  it('loginSchema requires login and password', () => {
    const r = loginSchema.safeParse({ login: '  ', password: '' });
    expect(r.success).toBe(false);
    const messages = Object.fromEntries(r.error!.issues.map((i) => [i.path[0], i.message]));
    expect(messages).toEqual({ login: 'validation.required', password: 'validation.required' });
    expect(firstError(loginSchema.safeParse({}))?.message).toBe('validation.required');
  });

  it('newPasswordSchema reports different passwords on repeatPassword', () => {
    const r = newPasswordSchema.safeParse({ newPassword: 'Urlop-2026', repeatPassword: 'Urlop-2025' });
    expect(firstError(r)).toMatchObject({ message: 'validation.passwords_differ', path: ['repeatPassword'] });
    expect(newPasswordSchema.safeParse({ newPassword: 'Urlop-2026', repeatPassword: 'Urlop-2026' }).success).toBe(true);
  });

  it('adminAccountSchema accepts a missing e-mail as null', () => {
    const r = adminAccountSchema.parse({ firstName: ' Anna ', lastName: 'Nowak ', login: 'Anna.Nowak@firma.pl', email: '', password: 'Urlop-2026' });
    expect(r).toEqual({ firstName: 'Anna', lastName: 'Nowak', login: 'anna.nowak@firma.pl', email: null, password: 'Urlop-2026' });
  });

  it('passwords are limited to 72 bytes, because bcrypt ignores the rest', () => {
    const fits = '1-' + 'ż'.repeat(35); // 72 bajty
    const tooLong = '1-' + 'ż'.repeat(36); // 74 bajty, tylko 38 znaków
    expect(newPassword.safeParse(fits).success).toBe(true);
    expect(firstError(newPassword.safeParse(tooLong))?.message).toBe('validation.too_long');
    expect(loginSchema.safeParse({ login: 'abc', password: fits }).success).toBe(true);
    expect(firstError(loginSchema.safeParse({ login: 'abc', password: tooLong }))?.message).toBe('validation.too_long');
  });
});
