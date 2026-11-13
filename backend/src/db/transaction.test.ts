import { describe, expect, it, vi } from 'vitest';

const conn = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
};
vi.mock('./pool', () => ({ pool: { getConnection: vi.fn(async () => conn) } }));

const { withTransaction } = await import('./transaction');

describe('withTransaction', () => {
  it('commits, returns the result and releases the connection', async () => {
    vi.clearAllMocks();
    await expect(withTransaction(async () => 7)).resolves.toBe(7);
    expect(conn.beginTransaction).toHaveBeenCalled();
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back, passes the error on and still releases the connection', async () => {
    vi.clearAllMocks();
    await expect(
      withTransaction(async () => {
        throw new Error('zapis się nie udał');
      }),
    ).rejects.toThrow('zapis się nie udał');
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
