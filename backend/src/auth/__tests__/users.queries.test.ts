import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { pool } = await import('../../db/pool');
const { findActiveUserById, findActiveUserByLogin, updatePassword } = await import('../users.queries');

beforeEach(() => {
  vi.mocked(pool.query).mockReset();
});

describe('users queries: token_version', () => {
  it('findActiveUserById finds the account only with the current token version', async () => {
    vi.mocked(pool.query).mockResolvedValue([[]] as never);
    expect(await findActiveUserById(2, 3)).toBeNull();
    const [sql, params] = vi.mocked(pool.query).mock.calls[0]! as unknown as [string, unknown[]];
    expect(sql).toContain('token_version = ?');
    expect(params).toEqual([2, 3]);
  });

  it('findActiveUserByLogin returns the token version for the new cookie', async () => {
    vi.mocked(pool.query).mockResolvedValue([[{ id: 2, name: 'Jan', role: 'employee', must_change_password: 0, password_hash: 'h', token_version: 4 }]] as never);
    expect(await findActiveUserByLogin('jan')).toMatchObject({ passwordHash: 'h', tokenVersion: 4 });
  });

  it('updatePassword raises token_version in the same query and returns the new value', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce([{ affectedRows: 1 }] as never)
      .mockResolvedValueOnce([[{ token_version: 2 }]] as never);
    expect(await updatePassword(2, 'h')).toBe(2);
    const [sql, params] = vi.mocked(pool.query).mock.calls[0]! as unknown as [string, unknown[]];
    expect(sql).toContain('password_hash = ?');
    expect(sql).toContain('token_version = token_version + 1');
    expect(params).toEqual(['h', 2]);
  });
});

describe('updatePassword in a transaction', () => {
  it('uses the given connection instead of the pool', async () => {
    vi.mocked(pool.query).mockReset();
    const conn = { query: vi.fn().mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([[{ token_version: 5 }]]) };
    expect(await updatePassword(2, 'h', conn as never)).toBe(5);
    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
