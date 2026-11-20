import { describe, expect, it } from 'vitest';
import { myAccountEmailSchema, myAccountPasswordSchema } from '../myAccount';

const issues = (r: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  (r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]);

describe('my account schemas', () => {
  it('email: empty → null, 190 characters ok, 191 too long, bad format', () => {
    expect(myAccountEmailSchema.parse({ email: '' })).toEqual({ email: null });
    expect(myAccountEmailSchema.parse({ email: null })).toEqual({ email: null });
    expect(myAccountEmailSchema.parse({ email: ' Jan.Kowalski@Firma.pl ' })).toEqual({ email: 'jan.kowalski@firma.pl' });
    const at = (length: number) => `${'a'.repeat(length - '@firma.pl'.length)}@firma.pl`;
    expect(myAccountEmailSchema.safeParse({ email: at(190) }).success).toBe(true);
    expect(issues(myAccountEmailSchema.safeParse({ email: at(191) }))).toEqual([['email', 'validation.too_long']]);
    expect(issues(myAccountEmailSchema.safeParse({ email: 'jan@' }))).toEqual([['email', 'validation.email_invalid']]);
  });

  const ok = { currentPassword: 'Stare-haslo1', newPassword: 'Urlop2026!', repeatPassword: 'Urlop2026!' };
  const withNew = (newPassword: string) => myAccountPasswordSchema.safeParse({ ...ok, newPassword, repeatPassword: newPassword });

  it('password: current required; new 7 too short, 8 ok, 72 bytes ok, 73 too long; needs a digit and a special sign', () => {
    expect(myAccountPasswordSchema.parse(ok)).toEqual(ok);
    expect(issues(myAccountPasswordSchema.safeParse({ ...ok, currentPassword: '' }))).toEqual([['currentPassword', 'validation.required']]);
    expect(issues(withNew('Abcde1!'))).toContainEqual(['newPassword', 'validation.password_rules']);
    expect(withNew('Abcdef1!').success).toBe(true);
    expect(withNew(`${'a'.repeat(70)}1!`).success).toBe(true);
    expect(issues(withNew(`${'a'.repeat(71)}1!`))).toContainEqual(['newPassword', 'validation.too_long']);
    expect(issues(withNew('Abcdefgh!'))).toContainEqual(['newPassword', 'validation.password_rules']);
    expect(issues(withNew('Abcdefgh1'))).toContainEqual(['newPassword', 'validation.password_rules']);
  });

  it('password: different repeat → validation.passwords_differ under repeatPassword', () => {
    expect(issues(myAccountPasswordSchema.safeParse({ ...ok, repeatPassword: 'Urlop2025!' }))).toEqual([['repeatPassword', 'validation.passwords_differ']]);
  });
});
