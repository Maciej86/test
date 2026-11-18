import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../projects.queries');

type Call = [string, unknown[] | undefined];
const spyDb = (...results: unknown[]) => {
  const calls: Call[] = [];
  let i = 0;
  const db = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push([sql, params]);
      const result = results[Math.min(i, results.length - 1)] ?? [];
      i += 1;
      return [result];
    }),
  };
  return { db: db as unknown as Db, calls };
};

describe('projects queries', () => {
  it('listProjects: membership condition in SQL for the viewer, counts without archived tasks', async () => {
    const { db, calls } = spyDb([{ id: 9, name: 'Marketing', position: 1, created_at: '2026-11-02 10:00:00', open_count: 3, done_count: 1 }]);
    const rows = await q.listProjects(db, { id: 5, name: 'Jan Kowalski', role: 'employee' });
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/\? = 'admin' OR EXISTS \(SELECT 1 FROM project_members/);
    expect(sql).toMatch(/archived_at IS NULL/);
    expect(sql).toMatch(/ORDER BY p\.position/);
    expect(params).toEqual(['employee', 5]);
    expect(rows).toEqual([{ id: 9, name: 'Marketing', position: 1, createdAt: '2026-11-02 10:00:00', openCount: 3, doneCount: 1 }]);
  });

  it('listMembers: open tasks per member without done and archived tasks; empty list asks nothing', async () => {
    const { db, calls } = spyDb([{ project_id: 9, user_id: 5, name: 'Jan Kowalski', archived_at: null, open_tasks: 2 }]);
    expect(await q.listMembers(db, [9])).toEqual([{ projectId: 9, id: 5, name: 'Jan Kowalski', archived: false, openTasks: 2 }]);
    expect(calls[0]![0]).toMatch(/column_key <> 'done'/);
    expect(calls[0]![0]).toMatch(/t\.archived_at IS NULL/);
    const empty = spyDb([]);
    expect(await q.listMembers(empty.db, [])).toEqual([]);
    expect(empty.calls).toHaveLength(0);
  });

  it('unassignOpenTasks removes the people only from not-done tasks of the project', async () => {
    const { db, calls } = spyDb({ affectedRows: 2 });
    await q.unassignOpenTasks(db, 9, [5]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/DELETE ta FROM task_assignees ta JOIN tasks t ON t\.id = ta\.task_id/);
    expect(sql).toMatch(/t\.project_id = \? AND t\.column_key <> 'done' AND ta\.user_id IN \(\?\)/);
    expect(params).toEqual([9, [5]]);
  });

  it('countAllTasks counts archived tasks too; projectsWithOpenAssignment skips projects the person belongs to', async () => {
    const count = spyDb([{ total: 4 }]);
    expect(await q.countAllTasks(count.db, 9)).toBe(4);
    expect(count.calls[0]![0]).not.toMatch(/archived_at/);
    const open = spyDb([{ id: 3, name: 'Montaż' }]);
    expect(await q.projectsWithOpenAssignment(open.db, 7)).toEqual([{ id: 3, name: 'Montaż' }]);
    expect(open.calls[0]![0]).toMatch(/NOT EXISTS \(SELECT 1 FROM project_members/);
    expect(open.calls[0]![0]).toMatch(/t\.column_key <> 'done' AND t\.archived_at IS NULL/);
  });

  it('findUsers returns role and archive flag; empty list asks nothing', async () => {
    const { db } = spyDb([{ id: 5, role: 'employee', archived_at: '2026-10-01' }]);
    expect(await q.findUsers(db, [5])).toEqual([{ id: 5, role: 'employee', archived: true }]);
    const empty = spyDb([]);
    expect(await q.findUsers(empty.db, [])).toEqual([]);
    expect(empty.calls).toHaveLength(0);
  });
});
