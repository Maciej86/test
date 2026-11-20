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

const doneSince = new Date('2026-10-21T00:00:00.000Z');
const taskRow = (id: number, due: string | null) => ({ id, title: `Zadanie ${id}`, project_id: 2, project_name: 'Produkcja', column_key: 'in_progress', due_date: due });

describe('tasks queries for the dashboard', () => {
  it('projectTaskCounts: every project in position order, zeros without tasks, without archived tasks', async () => {
    const { db, calls } = spyDb([
      { id: 1, name: 'Marketing', draft: '3', in_progress: '2', overdue: '1', done_recently: '5' },
      { id: 3, name: 'Montaż', draft: null, in_progress: null, overdue: null, done_recently: null },
    ]);
    expect(await q.projectTaskCounts(db, '2026-11-20', doneSince)).toEqual([
      { id: 1, name: 'Marketing', draft: 3, inProgress: 2, overdue: 1, doneRecently: 5 },
      { id: 3, name: 'Montaż', draft: 0, inProgress: 0, overdue: 0, doneRecently: 0 },
    ]);
    const [sql] = calls[0]!;
    expect(sql).toMatch(/FROM projects p LEFT JOIN tasks t ON t\.project_id = p\.id AND t\.archived_at IS NULL/);
    expect(sql).toMatch(/ORDER BY p\.position/);
  });

  it('projectTaskCounts: overdue = due_date < today and column ≠ done; doneRecently = completed_at >= doneSince', async () => {
    const { db, calls } = spyDb([]);
    await q.projectTaskCounts(db, '2026-11-20', doneSince);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/t\.column_key <> 'done' AND t\.due_date < \?/);
    expect(sql).toMatch(/t\.column_key = 'done' AND t\.completed_at >= \?/);
    expect(params).toEqual(['2026-11-20', doneSince]);
  });

  it('listOverdueTasks: all projects, without archived and done, ORDER BY due_date, project and task position, with assignees and total', async () => {
    const { db, calls } = spyDb(
      [taskRow(7, '2026-11-13'), taskRow(11, '2026-11-19')],
      [{ total: 4 }],
      [{ task_id: 7, name: 'Tomasz Wójcik', archived_at: null }, { task_id: 7, name: 'Ewa Mazur', archived_at: new Date() }],
    );
    const result = await q.listOverdueTasks(db, '2026-11-20', 5);
    expect(result.total).toBe(4);
    expect(result.items).toEqual([
      { id: 7, title: 'Zadanie 7', projectId: 2, projectName: 'Produkcja', column: 'in_progress', dueDate: '2026-11-13', assignees: [{ name: 'Tomasz Wójcik', archived: false }, { name: 'Ewa Mazur', archived: true }] },
      { id: 11, title: 'Zadanie 11', projectId: 2, projectName: 'Produkcja', column: 'in_progress', dueDate: '2026-11-19', assignees: [] },
    ]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/t\.archived_at IS NULL AND t\.column_key <> 'done' AND t\.due_date < \?/);
    expect(sql).toMatch(/ORDER BY t\.due_date, p\.position, t\.position LIMIT \?/);
    expect(params).toEqual(['2026-11-20', 5]);
    expect(calls[1]![1]).toEqual(['2026-11-20']);
    expect(calls[2]![1]).toEqual([[7, 11]]);
  });

  it('listOverdueTasks: nothing overdue → no assignee query', async () => {
    const { db, calls } = spyDb([], [{ total: 0 }]);
    expect(await q.listOverdueTasks(db, '2026-11-20', 5)).toEqual({ items: [], total: 0 });
    expect(calls).toHaveLength(2);
  });

  it('listMyOpenTasks: assigned to viewer, draft or in_progress, not archived, visible project only', async () => {
    const { db, calls } = spyDb([taskRow(3, '2026-11-18')], [{ total: 1 }]);
    const jan = { id: 5, name: 'Jan Kowalski', role: 'employee' as const };
    const result = await q.listMyOpenTasks(db, jan, 5);
    expect(result).toEqual({ items: [{ id: 3, title: 'Zadanie 3', projectId: 2, projectName: 'Produkcja', column: 'in_progress', dueDate: '2026-11-18' }], total: 1 });
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/JOIN task_assignees ta ON ta\.task_id = t\.id AND ta\.user_id = \?/);
    expect(sql).toMatch(/t\.archived_at IS NULL AND t\.column_key IN \('draft', 'in_progress'\)/);
    expect(sql).toMatch(/\? = 'admin' OR EXISTS \(SELECT 1 FROM project_members pm WHERE pm\.project_id = t\.project_id AND pm\.user_id = \?\)/);
    expect(params).toEqual([5, 'employee', 5, 5]);
    expect(calls[1]![1]).toEqual([5, 'employee', 5]);
  });

  it('listMyOpenTasks: overdue first, then due date, NULL last, then project and task position; total', async () => {
    const { db, calls } = spyDb([], [{ total: 0 }]);
    await q.listMyOpenTasks(db, { id: 1, name: 'Anna Nowak', role: 'admin' }, 5);
    expect(calls[0]![0]).toMatch(/ORDER BY t\.due_date IS NULL, t\.due_date, p\.position, t\.position LIMIT \?/);
  });
});
