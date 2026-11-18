import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TASK_MESSAGES as M } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../../notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));
vi.mock('../../employees/employees.queries', () => ({ listActiveUsers: vi.fn() }));
vi.mock('../projects.queries', () => ({
  listProjects: vi.fn(),
  listMembers: vi.fn(),
  findProject: vi.fn(),
  findByName: vi.fn(),
  maxPosition: vi.fn(),
  insertProject: vi.fn(),
  renameProject: vi.fn(),
  lockProjects: vi.fn(),
  setPosition: vi.fn(),
  memberIds: vi.fn(),
  addMembers: vi.fn(),
  removeMembers: vi.fn(),
  unassignOpenTasks: vi.fn(),
  countAllTasks: vi.fn(),
  deleteProject: vi.fn(),
  findUsers: vi.fn(),
  projectsWithOpenAssignment: vi.fn(),
}));

const q = await import('../projects.queries');
const { notifyUsers } = await import('../../notifications/notifications.service');
const { logActivity } = await import('../../../db/activityLog');
const { listActiveUsers } = await import('../../employees/employees.queries');
const s = await import('../projects.service');

const anna = { id: 1, name: 'Anna Nowak' };
const employee = (id: number, archived = false) => ({ id, role: 'employee' as const, archived });

beforeEach(() => {
  vi.mocked(q.findByName).mockResolvedValue(null);
  vi.mocked(q.maxPosition).mockResolvedValue(2);
  vi.mocked(q.insertProject).mockResolvedValue(9);
  vi.mocked(q.findProject).mockResolvedValue({ id: 9, name: 'Marketing', position: 3 });
  vi.mocked(q.memberIds).mockResolvedValue([5, 6]);
  vi.mocked(q.findUsers).mockImplementation(async (_db, ids) => ids.map((id) => employee(id)));
  vi.mocked(q.countAllTasks).mockResolvedValue(4);
});
afterEach(() => vi.clearAllMocks());

describe('projects: list and candidates', () => {
  it('project list filtered by the viewer, with members and their open tasks', async () => {
    vi.mocked(q.listProjects).mockResolvedValue([{ id: 9, name: 'Marketing', position: 1, createdAt: '2026-11-02', openCount: 3, doneCount: 1 }]);
    vi.mocked(q.listMembers).mockResolvedValue([{ projectId: 9, id: 5, name: 'Jan Kowalski', archived: false, openTasks: 2 }]);
    const jan = { id: 5, name: 'Jan Kowalski', role: 'employee' as const };
    const result = await s.listProjects(jan);
    expect(q.listProjects).toHaveBeenCalledWith(expect.anything(), jan);
    expect(q.listMembers).toHaveBeenCalledWith(expect.anything(), [9]);
    expect(result.items).toEqual([
      { id: 9, name: 'Marketing', position: 1, createdAt: '2026-11-02', openCount: 3, doneCount: 1, members: [{ id: 5, name: 'Jan Kowalski', archived: false, openTasks: 2 }] },
    ]);
  });

  it('candidates are active employees only', async () => {
    vi.mocked(listActiveUsers).mockResolvedValue([{ id: 5, name: 'Jan Kowalski' }]);
    expect(await s.listCandidates()).toEqual([{ id: 5, name: 'Jan Kowalski' }]);
    expect(listActiveUsers).toHaveBeenCalledWith(expect.anything(), 'employee');
  });
});

describe('projects: create', () => {
  it('new project at the end, members added, project_added for new members, history entry', async () => {
    expect(await s.createProject({ name: 'Marketing', memberIds: [5, 6] }, anna)).toEqual({ id: 9 });
    expect(q.insertProject).toHaveBeenCalledWith(conn, 'Marketing', 3);
    expect(q.addMembers).toHaveBeenCalledWith(conn, 9, [5, 6]);
    expect(notifyUsers).toHaveBeenCalledWith(conn, { type: 'project_added', userIds: [5, 6], params: { project: 'Marketing' }, link: '/admin/tasks/9', actor: anna });
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'create', entityType: 'projects', entityId: 9, userId: 1 }));
  });

  it('name taken → 409 with the field', async () => {
    vi.mocked(q.findByName).mockResolvedValue({ id: 3 });
    expect(await s.createProject({ name: 'Marketing', memberIds: [] }, anna)).toEqual({
      error: expect.objectContaining({ status: 409, message: M.projectNameTaken, fields: { name: M.projectNameTaken } }),
    });
    expect(q.insertProject).not.toHaveBeenCalled();
  });

  it('admin, archived or unknown person as a member → 400 on memberIds', async () => {
    for (const users of [[{ id: 5, role: 'admin' as const, archived: false }], [employee(5, true)], []]) {
      vi.mocked(q.findUsers).mockResolvedValueOnce(users);
      expect(await s.createProject({ name: 'Marketing', memberIds: [5] }, anna)).toEqual({
        error: expect.objectContaining({ status: 400, fields: { memberIds: M.memberNotAllowed } }),
      });
    }
    expect(q.insertProject).not.toHaveBeenCalled();
  });
});

describe('projects: update', () => {
  it('unknown project → 404', async () => {
    vi.mocked(q.findProject).mockResolvedValue(null);
    expect(await s.updateProject(9, { name: 'Marketing', memberIds: [] }, anna)).toEqual({ error: expect.objectContaining({ status: 404 }) });
  });

  it('removed member leaves open tasks of the project only; new members get project_added; history with members before → after', async () => {
    expect(await s.updateProject(9, { name: 'Marketing 2027', memberIds: [6, 7] }, anna)).toEqual({ ok: true });
    expect(q.renameProject).toHaveBeenCalledWith(conn, 9, 'Marketing 2027');
    expect(q.removeMembers).toHaveBeenCalledWith(conn, 9, [5]);
    expect(q.unassignOpenTasks).toHaveBeenCalledWith(conn, 9, [5]);
    expect(q.addMembers).toHaveBeenCalledWith(conn, 9, [7]);
    expect(notifyUsers).toHaveBeenCalledWith(conn, expect.objectContaining({ type: 'project_added', userIds: [7], params: { project: 'Marketing 2027' } }));
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      action: 'update', entityType: 'projects', entityId: 9,
      changes: { name: { before: 'Marketing', after: 'Marketing 2027' }, member_ids: { before: [5, 6], after: [6, 7] } },
    }));
  });

  it('an existing member who went to the archive may stay, but cannot be added', async () => {
    vi.mocked(q.findUsers).mockImplementation(async (_db, ids) => ids.map((id) => employee(id, id === 6)));
    expect(await s.updateProject(9, { name: 'Marketing', memberIds: [5, 6] }, anna)).toEqual({ ok: true });
    vi.mocked(q.memberIds).mockResolvedValue([5]);
    expect(await s.updateProject(9, { name: 'Marketing', memberIds: [5, 6] }, anna)).toEqual({ error: expect.objectContaining({ status: 400 }) });
  });

  it('no changes in members → no notifications and no unassigning', async () => {
    await s.updateProject(9, { name: 'Marketing', memberIds: [5, 6] }, anna);
    expect(q.unassignOpenTasks).not.toHaveBeenCalled();
    expect(notifyUsers).not.toHaveBeenCalled();
  });
});

describe('projects: move and delete', () => {
  it('move swaps with the neighbour on locked projects', async () => {
    vi.mocked(q.lockProjects).mockResolvedValue([{ id: 4, position: 1 }, { id: 9, position: 2 }]);
    expect(await s.moveProject(9, 'up')).toEqual({ ok: true });
    expect(q.setPosition).toHaveBeenCalledWith(conn, 9, 1);
    expect(q.setPosition).toHaveBeenCalledWith(conn, 4, 2);
  });

  it('wrong confirm name → 400 on confirmName, nothing deleted', async () => {
    expect(await s.deleteProject(9, 'Marketin', anna)).toEqual({
      error: expect.objectContaining({ status: 400, fields: { confirmName: M.projectConfirmMismatch } }),
    });
    expect(q.deleteProject).not.toHaveBeenCalled();
  });

  it('delete project counts all tasks including archived and writes history', async () => {
    expect(await s.deleteProject(9, 'Marketing', anna)).toEqual({ ok: true, deletedTasks: 4 });
    expect(q.deleteProject).toHaveBeenCalledWith(conn, 9);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      action: 'delete', entityType: 'projects', entityId: 9, changes: { name: { before: 'Marketing', after: null }, deleted_tasks: { before: 4, after: 0 } },
    }));
  });

  it('delete unknown project → 404', async () => {
    vi.mocked(q.findProject).mockResolvedValue(null);
    expect(await s.deleteProject(9, 'Marketing', anna)).toEqual({ error: expect.objectContaining({ status: 404 }) });
  });
});

describe('addMemberWhereAssigned (role change admin → employee)', () => {
  it('adds the person to projects with their open tasks and writes history for each', async () => {
    vi.mocked(q.projectsWithOpenAssignment).mockResolvedValue([{ id: 3, name: 'Montaż' }, { id: 9, name: 'Marketing' }]);
    expect(await s.addMemberWhereAssigned(conn as never, 7, anna)).toEqual([3, 9]);
    expect(q.projectsWithOpenAssignment).toHaveBeenCalledWith(conn, 7);
    expect(q.addMembers).toHaveBeenCalledWith(conn, 3, [7]);
    expect(q.addMembers).toHaveBeenCalledWith(conn, 9, [7]);
    expect(logActivity).toHaveBeenCalledTimes(2);
  });
});
