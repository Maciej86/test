import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../db/activityLog')>()),
  logActivity: vi.fn(),
}));
vi.mock('../employees.queries', () => ({
  listArchivedEmployees: vi.fn(),
  countArchivedEmployees: vi.fn(),
  lockUser: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../../my-leave/my-leave.queries', () => ({ countRequestsByUser: vi.fn() }));
vi.mock('../../tasks/tasks.queries', () => ({ countAssignmentsByUser: vi.fn() }));
vi.mock('../../tasks/projects.service', () => ({ addMemberWhereAssigned: vi.fn() }));

const q = await import('../employees.queries');
const myLeave = await import('../../my-leave/my-leave.queries');
const tasks = await import('../../tasks/tasks.queries');
const { logActivity } = await import('../../../db/activityLog');
const { pool } = await import('../../../db/pool');
const { deleteArchivedEmployee, listArchivedEmployees } = await import('../employees.service');

const anna = { id: 1, name: 'Anna Nowak' };
const olga = { id: 9, name: 'Olga Testowa', login: 'olga@firma.pl', role: 'employee', archived_at: new Date('2026-11-03T08:40:00Z') };

beforeEach(() => vi.clearAllMocks());

describe('archived employees', () => {
  it('list: only archived accounts, newest first, with leave request and task counts', async () => {
    vi.mocked(q.listArchivedEmployees).mockResolvedValue({
      rows: [{ ...olga, archived_by_name: 'Anna Nowak' }, { id: 4, name: 'Marek Lis', login: 'marek@firma.pl', role: 'admin', archived_at: new Date('2026-06-12T09:05:00Z'), archived_by_name: null }] as never,
      total: 2,
    });
    vi.mocked(myLeave.countRequestsByUser).mockResolvedValue(new Map([[4, 3]]));
    vi.mocked(tasks.countAssignmentsByUser).mockResolvedValue(new Map([[9, 2]]));
    const page = await listArchivedEmployees({ page: 2, search: 'o', sort: 'archived_at', dir: 'desc' });
    expect(q.listArchivedEmployees).toHaveBeenCalledWith(pool, { search: 'o', page: 2, pageSize: 25 });
    expect(myLeave.countRequestsByUser).toHaveBeenCalledWith(pool, [9, 4]);
    expect(page).toEqual({
      total: 2,
      page: 2,
      pageSize: 25,
      items: [
        { id: 9, name: 'Olga Testowa', login: 'olga@firma.pl', role: 'employee', archivedAt: '2026-11-03T08:40:00.000Z', archivedByName: 'Anna Nowak', leaveRequests: 0, tasks: 2 },
        { id: 4, name: 'Marek Lis', login: 'marek@firma.pl', role: 'admin', archivedAt: '2026-06-12T09:05:00.000Z', archivedByName: null, leaveRequests: 3, tasks: 0 },
      ],
    });
  });

  it('delete: missing account → 404', async () => {
    vi.mocked(q.lockUser).mockResolvedValue(null);
    expect(await deleteArchivedEmployee(9, 'Olga Testowa', anna)).toMatchObject({ error: { status: 404 } });
    expect(q.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: active account → 409 archive_first, nothing deleted', async () => {
    vi.mocked(q.lockUser).mockResolvedValue({ ...olga, archived_at: null } as never);
    expect(await deleteArchivedEmployee(9, 'Olga Testowa', anna)).toMatchObject({ error: { status: 409, message: 'server.archive_first' } });
    expect(q.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: account with leave requests → 409 has_leave_requests, nothing deleted', async () => {
    vi.mocked(q.lockUser).mockResolvedValue(olga as never);
    vi.mocked(myLeave.countRequestsByUser).mockResolvedValue(new Map([[9, 1]]));
    expect(await deleteArchivedEmployee(9, 'Olga Testowa', anna)).toMatchObject({ error: { status: 409, message: 'archive.server.has_leave_requests' } });
    expect(myLeave.countRequestsByUser).toHaveBeenCalledWith(conn, [9]);
    expect(q.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: wrong confirmName → 400 on the field, nothing deleted', async () => {
    vi.mocked(q.lockUser).mockResolvedValue(olga as never);
    vi.mocked(myLeave.countRequestsByUser).mockResolvedValue(new Map());
    expect(await deleteArchivedEmployee(9, 'olga testowa', anna)).toMatchObject({
      error: { status: 400, message: 'archive.server.confirm_mismatch', fields: { confirmName: 'archive.server.confirm_mismatch' } },
    });
    expect(q.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: deletes the account and logs delete / users with the name', async () => {
    vi.mocked(q.lockUser).mockResolvedValue(olga as never);
    vi.mocked(myLeave.countRequestsByUser).mockResolvedValue(new Map());
    expect(await deleteArchivedEmployee(9, 'Olga Testowa', anna)).toEqual({ ok: true });
    expect(q.lockUser).toHaveBeenCalledWith(conn, 9);
    expect(q.deleteUser).toHaveBeenCalledWith(conn, 9);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      userId: 1, userName: 'Anna Nowak', action: 'delete', entityType: 'users', entityId: 9, entityName: 'Olga Testowa',
    }));
  });
});
