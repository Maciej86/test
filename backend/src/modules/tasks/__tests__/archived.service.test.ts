import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../db/activityLog')>()),
  logActivity: vi.fn(),
}));
vi.mock('../../notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));
vi.mock('../../leave-requests/leave-requests.queries', () => ({ listApprovedLeaves: vi.fn() }));
vi.mock('../comments.queries', () => ({ commentCounts: vi.fn(), listComments: vi.fn() }));
vi.mock('../tasks.queries', () => ({
  listArchivedTasks: vi.fn(),
  archivedTaskProjects: vi.fn(),
  countArchivedTasks: vi.fn(),
  findAnyTask: vi.fn(),
  assigneeNames: vi.fn(),
  lockProject: vi.fn(),
  columnTaskIds: vi.fn(),
  setPositions: vi.fn(),
  restoreTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const q = await import('../tasks.queries');
const comments = await import('../comments.queries');
const { logActivity } = await import('../../../db/activityLog');
const { pool } = await import('../../../db/pool');
const { deleteArchivedTask, getArchivedTask, listArchivedTasks, restoreArchivedTask } = await import('../tasks.service');

const anna = { id: 1, name: 'Anna Nowak' };
const archived = {
  id: 31, title: 'Spotkanie', description: 'Ceny na 2027', projectId: 3, projectName: 'Biuro', column: 'in_progress' as const,
  dueDate: '2026-11-28', archivedAt: '2026-11-10T07:47:00.000Z', archivedByName: 'Tomasz Wójcik', archived: true,
};

beforeEach(() => vi.clearAllMocks());

describe('archived tasks', () => {
  it('list: only archived tasks, filtered by project and title, with projects that have archived tasks', async () => {
    vi.mocked(q.listArchivedTasks).mockResolvedValue({ rows: [archived], total: 1 });
    vi.mocked(q.archivedTaskProjects).mockResolvedValue([{ id: 3, name: 'Biuro' }]);
    vi.mocked(comments.commentCounts).mockResolvedValue(new Map([[31, 2]]));
    const page = await listArchivedTasks({ page: 1, search: 'spot', sort: 'archived_at', dir: 'desc', projectId: 3 });
    expect(q.listArchivedTasks).toHaveBeenCalledWith(pool, { search: 'spot', projectId: 3, page: 1, pageSize: 25 });
    expect(page).toEqual({
      total: 1, page: 1, pageSize: 25, projects: [{ id: 3, name: 'Biuro' }],
      items: [{ id: 31, title: 'Spotkanie', projectId: 3, projectName: 'Biuro', column: 'in_progress', dueDate: '2026-11-28', comments: 2, archivedAt: '2026-11-10T07:47:00.000Z', archivedByName: 'Tomasz Wójcik' }],
    });
  });

  it('details: missing or active task → 404', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValueOnce(null).mockResolvedValueOnce({ ...archived, archived: false });
    expect(await getArchivedTask(31)).toMatchObject({ error: { status: 404 } });
    expect(await getArchivedTask(31)).toMatchObject({ error: { status: 404 } });
  });

  it('details: description, assignees with archived flag, comments', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValue(archived);
    vi.mocked(q.assigneeNames).mockResolvedValue([{ name: 'Robert Kamiński', archived: true }]);
    vi.mocked(comments.listComments).mockResolvedValue([
      { id: 5, authorId: null, authorName: 'Ewa Mazurek', authorArchived: false, text: 'Przenoszę', createdAt: '2026-11-08T09:14:00.000Z', editedAt: null },
    ]);
    expect(await getArchivedTask(31)).toEqual({
      id: 31, title: 'Spotkanie', projectId: 3, projectName: 'Biuro', column: 'in_progress', dueDate: '2026-11-28', comments: 1,
      archivedAt: '2026-11-10T07:47:00.000Z', archivedByName: 'Tomasz Wójcik', description: 'Ceny na 2027',
      assignees: [{ name: 'Robert Kamiński', archived: true }],
      commentsList: [{ id: 5, authorName: 'Ewa Mazurek', authorArchived: true, createdAt: '2026-11-08T09:14:00.000Z', text: 'Przenoszę' }],
    });
  });

  it('restore: missing task or deleted project → 404, nothing changed', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValueOnce(null);
    expect(await restoreArchivedTask(31, anna)).toMatchObject({ error: { status: 404 } });
    vi.mocked(q.findAnyTask).mockResolvedValueOnce(archived);
    vi.mocked(q.lockProject).mockResolvedValueOnce(null);
    expect(await restoreArchivedTask(31, anna)).toMatchObject({ error: { status: 404 } });
    expect(q.restoreTask).not.toHaveBeenCalled();
  });

  it('restore: active task → 409 not_archived', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValue({ ...archived, archived: false });
    vi.mocked(q.lockProject).mockResolvedValue('Biuro');
    expect(await restoreArchivedTask(31, anna)).toMatchObject({ error: { status: 409, message: 'archive.server.not_archived' } });
    expect(q.restoreTask).not.toHaveBeenCalled();
  });

  it('restore: goes to the end of its column and logs restore', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValue(archived);
    vi.mocked(q.lockProject).mockResolvedValue('Biuro');
    vi.mocked(q.columnTaskIds).mockResolvedValue([4, 8]);
    expect(await restoreArchivedTask(31, anna)).toEqual({ ok: true });
    expect(q.findAnyTask).toHaveBeenLastCalledWith(conn, 31, { lock: true });
    expect(q.columnTaskIds).toHaveBeenCalledWith(conn, 3, 'in_progress');
    expect(q.restoreTask).toHaveBeenCalledWith(conn, 31);
    expect(q.setPositions).toHaveBeenCalledWith(conn, [4, 8, 31]);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      userId: 1, action: 'restore', entityType: 'tasks', entityId: 31, entityName: 'Spotkanie', entityContext: { project: 'Biuro' },
    }));
  });

  it('delete: active task → 409 archive_first; missing → 404', async () => {
    vi.mocked(q.lockProject).mockResolvedValue('Biuro');
    vi.mocked(q.findAnyTask).mockResolvedValue({ ...archived, archived: false });
    expect(await deleteArchivedTask(31, anna)).toMatchObject({ error: { status: 409, message: 'server.archive_first' } });
    vi.mocked(q.findAnyTask).mockResolvedValue(null);
    expect(await deleteArchivedTask(31, anna)).toMatchObject({ error: { status: 404 } });
    expect(q.deleteTask).not.toHaveBeenCalled();
  });

  it('delete: deletes the task and logs delete', async () => {
    vi.mocked(q.findAnyTask).mockResolvedValue(archived);
    vi.mocked(q.lockProject).mockResolvedValue('Biuro');
    expect(await deleteArchivedTask(31, anna)).toEqual({ ok: true });
    expect(q.deleteTask).toHaveBeenCalledWith(conn, 31);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'delete', entityType: 'tasks', entityId: 31, entityName: 'Spotkanie' }));
  });
});
