import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../comments.queries');

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
const jan = { id: 5, name: 'Jan Kowalski', role: 'employee' as const };
const row = (o: object = {}) => ({
  id: 3, task_id: 7, project_id: 9, user_id: 5, user_name: 'Jan Kowalski', archived_at: null, text: 'Tonery\nw piątek',
  edited_at: null, created_at: '2026-11-19T08:30:00.000Z', ...o,
});

describe('comments queries', () => {
  it('listComments: oldest first (then id), archived author flagged, deleted author → authorId null with the copied name', async () => {
    const { db, calls } = spyDb([row(), row({ id: 4, user_id: null, user_name: 'Ewa Mazur' }), row({ id: 5, user_id: 6, archived_at: '2026-11-01', edited_at: '2026-11-19T09:00:00.000Z' })]);
    const list = await q.listComments(db, 7);
    expect(calls[0]![0]).toMatch(/LEFT JOIN users u ON u\.id = c\.user_id/);
    expect(calls[0]![0]).toMatch(/WHERE c\.task_id = \? ORDER BY c\.created_at, c\.id$/);
    expect(calls[0]![1]).toEqual([7]);
    expect(list[0]).toEqual({ id: 3, authorId: 5, authorName: 'Jan Kowalski', authorArchived: false, text: 'Tonery\nw piątek', createdAt: '2026-11-19T08:30:00.000Z', editedAt: null });
    expect(list[1]).toMatchObject({ authorId: null, authorName: 'Ewa Mazur', authorArchived: false });
    expect(list[2]).toMatchObject({ authorId: 6, authorArchived: true, editedAt: '2026-11-19T09:00:00.000Z' });
  });

  it('findComment: only on a not archived task of a project the viewer sees; optional lock; null when missing', async () => {
    const { db, calls } = spyDb([row()]);
    expect(await q.findComment(db, 3, jan, { lock: true })).toMatchObject({ id: 3, taskId: 7, projectId: 9, authorId: 5, text: 'Tonery\nw piątek' });
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/JOIN tasks t ON t\.id = c\.task_id/);
    expect(sql).toMatch(/c\.id = \? AND t\.archived_at IS NULL AND \(\? = 'admin' OR EXISTS \(SELECT 1 FROM project_members pm WHERE pm\.project_id = t\.project_id AND pm\.user_id = \?\)\)/);
    expect(sql).toMatch(/FOR UPDATE$/);
    expect(params).toEqual([3, 'employee', 5]);
    const none = spyDb([]);
    expect(await q.findComment(none.db, 3, jan)).toBeNull();
    expect(none.calls[0]![0]).not.toMatch(/FOR UPDATE/);
  });

  it('insertComment saves the author id and name copy; updateCommentText sets edited_at; deleteComment', async () => {
    const ins = spyDb({ insertId: 12 });
    expect(await q.insertComment(ins.db, 7, { id: 5, name: 'Jan Kowalski' }, 'Tonery')).toBe(12);
    expect(ins.calls[0]![0]).toMatch(/INSERT INTO task_comments \(task_id, user_id, user_name, text\) VALUES \(\?, \?, \?, \?\)/);
    expect(ins.calls[0]![1]).toEqual([7, 5, 'Jan Kowalski', 'Tonery']);
    const upd = spyDb({});
    await q.updateCommentText(upd.db, 3, 'Nowy');
    expect(upd.calls[0]![0]).toMatch(/UPDATE task_comments SET text = \?, edited_at = NOW\(\) WHERE id = \?/);
    expect(upd.calls[0]![1]).toEqual(['Nowy', 3]);
    const del = spyDb({});
    await q.deleteComment(del.db, 3);
    expect(del.calls[0]![0]).toMatch(/DELETE FROM task_comments WHERE id = \?/);
    expect(del.calls[0]![1]).toEqual([3]);
  });

  it('commentCounts: per task; empty list asks nothing', async () => {
    const { db, calls } = spyDb([{ task_id: 7, n: 2 }, { task_id: 8, n: 1 }]);
    expect(await q.commentCounts(db, [7, 8, 9])).toEqual(new Map([[7, 2], [8, 1]]));
    expect(calls[0]![0]).toMatch(/WHERE task_id IN \(\?\) GROUP BY task_id/);
    expect(calls[0]![1]).toEqual([[7, 8, 9]]);
    const empty = spyDb([]);
    expect(await q.commentCounts(empty.db, [])).toEqual(new Map());
    expect(empty.calls).toHaveLength(0);
  });
});
