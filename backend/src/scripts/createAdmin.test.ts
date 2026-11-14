import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool', () => ({ pool: { query: vi.fn(), end: vi.fn() } }));
const { createAdminAccount } = await import('./createAdmin');
type AdminRow = import('./createAdmin').AdminRow;
const { verifyPassword } = await import('../auth/password');

const good = { name: 'Anna Nowak', login: 'Anna.Nowak@firma.pl', email: '', password: 'Urlop-2026' };
const deps = () => ({
  loginTaken: vi.fn(async (_login: string) => false),
  emailTaken: vi.fn(async (_email: string) => false),
  insert: vi.fn(async (_row: AdminRow) => 1),
});

describe('createAdminAccount', () => {
  it('creates an admin with a password hash, not the password', async () => {
    const d = deps();
    expect(await createAdminAccount(good, d)).toEqual({ ok: true, id: 1 });
    const row = d.insert.mock.calls[0]![0]!;
    expect(row).toMatchObject({ name: 'Anna Nowak', login: 'anna.nowak@firma.pl', email: null, role: 'admin' });
    expect(JSON.stringify(row)).not.toContain('Urlop-2026');
    expect(await verifyPassword('Urlop-2026', row.passwordHash)).toBe(true);
  });

  it('refuses a login that is taken without inserting', async () => {
    const d = deps();
    d.loginTaken.mockResolvedValue(true);
    expect(await createAdminAccount(good, d)).toEqual({ ok: false, errors: { login: 'validation.login_taken' } });
    expect(d.insert).not.toHaveBeenCalled();
  });

  it('refuses an e-mail that is taken without inserting', async () => {
    const d = deps();
    d.emailTaken.mockResolvedValue(true);
    const result = await createAdminAccount({ ...good, email: 'anna@firma.pl' }, d);
    expect(result).toEqual({ ok: false, errors: { email: 'validation.email_taken' } });
    expect(d.insert).not.toHaveBeenCalled();
  });

  it('refuses a weak password with password_rules', async () => {
    const d = deps();
    const result = await createAdminAccount({ ...good, password: 'haslo123' }, d);
    expect(result).toEqual({ ok: false, errors: { password: 'validation.password_rules' } });
    expect(d.insert).not.toHaveBeenCalled();
  });
});
