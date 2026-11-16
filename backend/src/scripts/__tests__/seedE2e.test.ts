import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn(), end: vi.fn() } }));
const { E2E_ACCOUNTS, seedE2eAccounts } = await import('../seedE2e');
const { verifyPassword } = await import('../../auth/password');

describe('seedE2eAccounts', () => {
  it('refuses to run in production', async () => {
    const save = vi.fn();
    await expect(seedE2eAccounts({ NODE_ENV: 'production', E2E_PASSWORD: 'Test-123' }, save)).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });

  it('refuses to run without E2E_PASSWORD', async () => {
    await expect(seedE2eAccounts({ NODE_ENV: 'development' }, vi.fn())).rejects.toThrow();
  });

  it('saves an admin and an employee with a temporary password, hashed', async () => {
    const save = vi.fn(async () => {});
    await seedE2eAccounts({ NODE_ENV: 'development', E2E_PASSWORD: 'Test-123' }, save);
    expect(save).toHaveBeenCalledTimes(2);
    const [admin, employee] = save.mock.calls.map((c) => (c as unknown[])[0] as Record<string, unknown>);
    expect(admin).toMatchObject({ login: E2E_ACCOUNTS.admin, role: 'admin', mustChangePassword: false });
    expect(employee).toMatchObject({ login: E2E_ACCOUNTS.employee, role: 'employee', mustChangePassword: true });
    expect(await verifyPassword('Test-123', String(admin!.passwordHash))).toBe(true);
  });
});
