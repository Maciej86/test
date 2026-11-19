import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));
vi.mock('../tasks.queries', () => ({ findTask: vi.fn(), assigneesOf: vi.fn() }));
vi.mock('../comments.queries', () => ({
  listComments: vi.fn(),
  findComment: vi.fn(),
  insertComment: vi.fn(),
  updateCommentText: vi.fn(),
  deleteComment: vi.fn(),
}));

const tq = await import('../tasks.queries');
const cq = await import('../comments.queries');
const { pool } = await import('../../../db/pool');
const { notifyUsers } = await import('../../notifications/notifications.service');
const s = await import('../comments.service');

const jan = { id: 5, name: 'Jan Kowalski', role: 'employee' as const };
const piotr = { id: 6, name: 'Piotr Zieliński', role: 'employee' as const };
const anna = { id: 1, name: 'Anna Nowak', role: 'admin' as const };
const task = {
  id: 7, projectId: 9, title: 'Zamówić ulotki', description: null, dueDate: null, column: 'draft' as const, position: 1,
  completedAt: null, finishedAt: null, createdByName: 'Anna Nowak', createdAt: '2026-11-05T10:00:00.000Z',
};
const comment = (o: object = {}) => ({
  id: 3, taskId: 7, projectId: 9, authorId: 5, authorName: 'Jan Kowalski', authorArchived: false, text: 'Tonery',
  createdAt: '2026-11-19T08:30:00.000Z', editedAt: null, ...o,
});

beforeEach(() => {
  vi.mocked(tq.findTask).mockResolvedValue(task);
  vi.mocked(tq.assigneesOf).mockResolvedValue(new Map([[7, [5, 6, 8]]]));
  vi.mocked(cq.insertComment).mockResolvedValue(12);
  vi.mocked(cq.findComment).mockResolvedValue(comment());
});
afterEach(() => vi.clearAllMocks());

describe('comments service', () => {
  it('listTaskComments: canEdit only for the author, canDelete for the author and an admin; invisible task → 404', async () => {
    vi.mocked(cq.listComments).mockResolvedValue([comment({ id: 3, authorId: 5 }), comment({ id: 4, authorId: 6 }), comment({ id: 5, authorId: null })].map(({ taskId: _t, projectId: _p, ...c }) => c));
    const asJan = await s.listTaskComments(7, jan);
    expect(tq.findTask).toHaveBeenCalledWith(pool, 7, jan);
    expect(asJan).toEqual([
      expect.objectContaining({ id: 3, canEdit: true, canDelete: true }),
      expect.objectContaining({ id: 4, canEdit: false, canDelete: false }),
      expect.objectContaining({ id: 5, canEdit: false, canDelete: false }),
    ]);
    const asAnna = await s.listTaskComments(7, anna);
    expect(asAnna).toEqual([
      expect.objectContaining({ id: 3, canEdit: false, canDelete: true }),
      expect.objectContaining({ id: 4, canEdit: false, canDelete: true }),
      expect.objectContaining({ id: 5, canEdit: false, canDelete: true }),
    ]);
    vi.mocked(tq.findTask).mockResolvedValue(null);
    expect(await s.listTaskComments(7, jan)).toEqual({ error: expect.objectContaining({ status: 404, message: 'tasks.task_not_found' }) });
  });

  it('addComment: locks the task, saves with the viewer as author, notifies assignees except the author', async () => {
    expect(await s.addComment(7, { text: 'Tonery będą w piątek' }, jan)).toEqual({ id: 12 });
    expect(tq.findTask).toHaveBeenCalledWith(conn, 7, jan, { lock: true });
    expect(cq.insertComment).toHaveBeenCalledWith(conn, 7, { id: 5, name: 'Jan Kowalski' }, 'Tonery będą w piątek');
    expect(notifyUsers).toHaveBeenCalledWith(conn, {
      type: 'task_comment',
      userIds: [6, 8],
      params: { task: 'Zamówić ulotki', excerpt: 'Tonery będą w piątek' },
      link: '/admin/tasks/9?task=7',
      actor: { id: 5, name: 'Jan Kowalski' },
    });
  });

  it('addComment: excerpt of a long comment; nobody else assigned → no notification; invisible task → 404', async () => {
    await s.addComment(7, { text: `${'a'.repeat(100)}` }, piotr);
    expect(vi.mocked(notifyUsers).mock.calls[0]![1].params).toEqual({ task: 'Zamówić ulotki', excerpt: `${'a'.repeat(79)}…` });
    vi.clearAllMocks();
    vi.mocked(tq.findTask).mockResolvedValue(task);
    vi.mocked(tq.assigneesOf).mockResolvedValue(new Map([[7, [5]]]));
    vi.mocked(cq.insertComment).mockResolvedValue(13);
    expect(await s.addComment(7, { text: 'Ok' }, jan)).toEqual({ id: 13 });
    expect(notifyUsers).not.toHaveBeenCalled();
    vi.mocked(tq.findTask).mockResolvedValue(null);
    expect(await s.addComment(7, { text: 'Ok' }, jan)).toEqual({ error: expect.objectContaining({ status: 404, message: 'tasks.task_not_found' }) });
    expect(cq.insertComment).toHaveBeenCalledTimes(1);
  });

  it('editComment: author ok; the same text changes nothing; someone else (employee or admin) → 403; missing → 404', async () => {
    expect(await s.editComment(3, { text: 'Nowy' }, jan)).toEqual({ ok: true });
    // Kolejność blokad jak przy usuwaniu zadania i projektu (zadanie → komentarz): najpierw zadanie, potem komentarz.
    expect(cq.findComment).toHaveBeenNthCalledWith(1, conn, 3, jan);
    expect(tq.findTask).toHaveBeenCalledWith(conn, 7, jan, { lock: true });
    expect(cq.findComment).toHaveBeenNthCalledWith(2, conn, 3, jan, { lock: true });
    expect(vi.mocked(tq.findTask).mock.invocationCallOrder[0]!).toBeLessThan(vi.mocked(cq.findComment).mock.invocationCallOrder[1]!);
    expect(cq.updateCommentText).toHaveBeenCalledWith(conn, 3, 'Nowy');
    vi.mocked(cq.updateCommentText).mockClear();
    expect(await s.editComment(3, { text: 'Tonery' }, jan)).toEqual({ ok: true });
    expect(cq.updateCommentText).not.toHaveBeenCalled();
    for (const other of [piotr, anna]) {
      expect(await s.editComment(3, { text: 'X' }, other)).toEqual({ error: expect.objectContaining({ status: 403, message: 'tasks.comment_not_author' }) });
    }
    vi.mocked(cq.findComment).mockResolvedValue(null);
    expect(await s.editComment(3, { text: 'X' }, jan)).toEqual({ error: expect.objectContaining({ status: 404, message: 'tasks.comment_not_found' }) });
    expect(cq.updateCommentText).not.toHaveBeenCalled();
  });

  it('removeComment: author ok, admin ok, other employee → 403, missing → 404', async () => {
    expect(await s.removeComment(3, jan)).toEqual({ ok: true });
    expect(await s.removeComment(3, anna)).toEqual({ ok: true });
    expect(cq.deleteComment).toHaveBeenCalledTimes(2);
    expect(cq.deleteComment).toHaveBeenCalledWith(conn, 3);
    expect(await s.removeComment(3, piotr)).toEqual({ error: expect.objectContaining({ status: 403, message: 'tasks.comment_not_author' }) });
    vi.mocked(cq.findComment).mockResolvedValue(null);
    expect(await s.removeComment(3, anna)).toEqual({ error: expect.objectContaining({ status: 404, message: 'tasks.comment_not_found' }) });
    expect(cq.deleteComment).toHaveBeenCalledTimes(2);
  });
});
