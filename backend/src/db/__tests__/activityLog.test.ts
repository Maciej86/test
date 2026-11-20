import { describe, expect, it, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { diffChanges, logActivity } from '../activityLog';

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
      entityName: 'Zamówienie 7',
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
      'Zamówienie 7',
      null,
      JSON.stringify({ status: { before: 'new', after: 'sent' } }),
    ]);
  });
});

describe('logActivity entity name and context', () => {
  it('stores entity name and context as parameters, never in the SQL text', async () => {
    const query = vi.fn().mockResolvedValue([{}, []]);
    const conn = { query } as unknown as PoolConnection;
    const name = "Robert'); DROP TABLE users; --";
    await logActivity(conn, {
      userId: 1, userName: 'Anna', action: 'create', entityType: 'tasks', entityId: 3,
      entityName: name, entityContext: { project: 'Marketing' }, changes: {},
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toBe(
      'INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, entity_name, entity_context, changes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    expect(params).toEqual([1, 'Anna', 'create', 'tasks', 3, name, JSON.stringify({ project: 'Marketing' }), '{}']);
  });

  it('long name is cut to the column size (255); too long context is dropped, never cut', async () => {
    const query = vi.fn().mockResolvedValue([{}, []]);
    const conn = { query } as unknown as PoolConnection;
    await logActivity(conn, {
      userId: null, userName: 'Anna', action: 'create', entityType: 'tasks', entityId: 3,
      entityName: 'x'.repeat(300), entityContext: { project: 'y'.repeat(300) }, changes: {},
    });
    const params = query.mock.calls[0][1] as unknown[];
    expect((params[5] as string).length).toBe(255);
    expect(params[6]).toBeNull();
  });
});
