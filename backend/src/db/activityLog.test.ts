import { describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { diffChanges, logActivity } from './activityLog';

describe('diffChanges', () => {
  it('keeps only changed fields and ignores updated_at', () => {
    expect(
      diffChanges({ status: 'new', name: 'A', updated_at: 1 }, { status: 'sent', name: 'A', updated_at: 2 }),
    ).toEqual({ status: { before: 'new', after: 'sent' } });
  });

  it('records added and removed fields', () => {
    expect(diffChanges({ a: 1 }, { b: 2 })).toEqual({
      a: { before: 1, after: undefined },
      b: { before: undefined, after: 2 },
    });
  });
});

describe('logActivity', () => {
  it('inserts through the given connection with parameters', async () => {
    const query = vi.fn().mockResolvedValue([{}, []]);
    const conn = { query } as unknown as PoolConnection;
    await logActivity(conn, {
      userId: 1,
      userName: 'Anna',
      action: 'update',
      entityType: 'orders',
      entityId: 7,
      changes: { status: { before: 'new', after: 'sent' } },
    });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO activity_log/);
    expect(sql).toContain('?');
    expect(params).toEqual([
      1,
      'Anna',
      'update',
      'orders',
      7,
      JSON.stringify({ status: { before: 'new', after: 'sent' } }),
    ]);
  });
});
