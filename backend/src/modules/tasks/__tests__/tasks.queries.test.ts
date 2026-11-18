import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../tasks.queries');

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

describe('board queries', () => {
  it('findVisibleProject: admin or member, condition in SQL', async () => {
    const { db, calls } = spyDb([{ id: 9, name: 'Marketing' }]);
    expect(await q.findVisibleProject(db, 9, { id: 5, name: 'Jan Kowalski', role: 'employee' })).toEqual({ id: 9, name: 'Marketing' });
    expect(calls[0]![0]).toMatch(/p\.id = \? AND \(\? = 'admin' OR EXISTS \(SELECT 1 FROM project_members/);
    expect(calls[0]![1]).toEqual([9, 'employee', 5]);
  });

  it('boardPeople: active admins, members and assignees of tasks, with assignable', async () => {
    const { db, calls } = spyDb([{ id: 8, name: 'Ewa Mazur', role: 'employee', archived_at: '2026-10-01', is_member: 1 }]);
    expect(await q.boardPeople(db, 9)).toEqual([{ id: 8, name: 'Ewa Mazur', role: 'employee', archived: true, assignable: false }]);
    expect(calls[0]![0]).toMatch(/role = 'admin' AND u\.archived_at IS NULL/);
    expect(calls[0]![0]).toMatch(/task_assignees/);
  });

  it('boardTasks: without archived, old done hidden unless asked, column then position order', async () => {
    const since = new Date('2026-10-19T08:00:00Z');
    const { db, calls } = spyDb([]);
    await q.boardTasks(db, 9, { includeOldDone: false, doneSince: since });
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/t\.archived_at IS NULL/);
    expect(sql).toMatch(/t\.column_key <> 'done' OR \? OR t\.completed_at >= \?/);
    expect(sql).toMatch(/ORDER BY FIELD\(t\.column_key, 'draft', 'in_progress', 'done'\), t\.position/);
    expect(params).toEqual([9, false, since]);
  });

  it('assigneesOf groups people by task; empty list asks nothing', async () => {
    const { db } = spyDb([{ task_id: 7, user_id: 5 }, { task_id: 7, user_id: 6 }]);
    expect(await q.assigneesOf(db, [7])).toEqual(new Map([[7, [5, 6]]]));
    const empty = spyDb([]);
    expect(await q.assigneesOf(empty.db, [])).toEqual(new Map());
    expect(empty.calls).toHaveLength(0);
  });
});
