import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn(), end: vi.fn() } }));
const { E2E_ACCOUNTS, removeTemporaryData, seedE2eAccounts, seedE2eNotifications } = await import('../seedE2e');
const { pool } = await import('../../db/pool');
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

  it('removes temporary accounts and leave types added by browser tests', async () => {
    vi.mocked(pool.query).mockResolvedValue([{}] as never);
    await removeTemporaryData();
    expect(vi.mocked(pool.query).mock.calls).toEqual([
      ['DELETE FROM users WHERE login LIKE ?', ['e2e.tmp.%@test.local']],
      ['DELETE FROM leave_types WHERE name LIKE ?', ['E2E %']],
    ]);
  });
});

describe('seedE2eNotifications', () => {
  it('replaces the e2e admin notifications: two unread, one read; only with ? parameters', async () => {
    vi.mocked(pool.query).mockClear();
    await seedE2eNotifications();
    const calls = vi.mocked(pool.query).mock.calls as unknown as [string, unknown[]][];
    expect(calls[0]![0]).toMatch(/DELETE FROM notifications WHERE user_id IN \(SELECT id FROM users WHERE login IN \(\?\)\)/);
    expect(calls[0]![1]).toEqual([[E2E_ACCOUNTS.admin, E2E_ACCOUNTS.employee]]);
    const inserts = calls.slice(1);
    expect(inserts).toHaveLength(3);
    for (const [sql, params] of inserts) {
      expect(sql).toMatch(/INSERT INTO notifications \(user_id, type, params, actor_name, link, read_at\) SELECT id, \?, \?, \?, \?, (NULL|NOW\(\) - INTERVAL 1 DAY) FROM users WHERE login = \?/);
      expect(params.at(-1)).toBe(E2E_ACCOUNTS.admin);
    }
    expect(inserts.filter(([sql]) => sql.includes('NULL FROM'))).toHaveLength(2);
  });
});
