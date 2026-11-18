import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../../notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));
vi.mock('../../leave-requests/leave-requests.queries', () => ({ listApprovedLeaves: vi.fn() }));
vi.mock('../tasks.queries', () => ({
  findVisibleProject: vi.fn(),
  boardPeople: vi.fn(),
  boardTasks: vi.fn(),
  countOldDone: vi.fn(),
  assigneesOf: vi.fn(),
  findTask: vi.fn(),
  columnTaskIds: vi.fn(),
  setPositions: vi.fn(),
  insertTask: vi.fn(),
  updateTask: vi.fn(),
  setColumn: vi.fn(),
  setAssignees: vi.fn(),
  archiveTask: vi.fn(),
  lockProject: vi.fn(),
}));

const q = await import('../tasks.queries');
const { listApprovedLeaves } = await import('../../leave-requests/leave-requests.queries');
const { notifyUsers } = await import('../../notifications/notifications.service');
const { logActivity } = await import('../../../db/activityLog');
const s = await import('../tasks.service');

const jan = { id: 5, name: 'Jan Kowalski', role: 'employee' as const };
const anna = { id: 1, name: 'Anna Nowak', role: 'admin' as const };
const row = (o: Partial<import('../tasks.queries').TaskRow> = {}): import('../tasks.queries').TaskRow => ({
  id: 7, projectId: 9, title: 'Oferta dla hurtowni', description: null, dueDate: '2026-11-25', column: 'in_progress', position: 1,
  completedAt: null, createdByName: 'Anna Nowak', createdAt: '2026-11-05T10:00:00.000Z', ...o,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-18T08:00:00Z'));
  vi.mocked(q.findVisibleProject).mockResolvedValue({ id: 9, name: 'Marketing' });
  vi.mocked(q.boardPeople).mockResolvedValue([]);
  vi.mocked(q.boardTasks).mockResolvedValue([]);
  vi.mocked(q.countOldDone).mockResolvedValue(2);
  vi.mocked(q.assigneesOf).mockResolvedValue(new Map());
  vi.mocked(listApprovedLeaves).mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('board', () => {
  it('project the viewer cannot see → 404 (same as a missing one)', async () => {
    vi.mocked(q.findVisibleProject).mockResolvedValue(null);
    expect(await s.getBoard(9, jan, false)).toEqual({ error: expect.objectContaining({ status: 404 }) });
    expect(q.findVisibleProject).toHaveBeenCalledWith(expect.anything(), 9, jan);
    expect(q.boardTasks).not.toHaveBeenCalled();
  });

  it('board people include archived assignees; assignable comes from the query', async () => {
    const people = [
      { id: 1, name: 'Anna Nowak', role: 'admin' as const, archived: false, assignable: true },
      { id: 8, name: 'Ewa Mazur', role: 'employee' as const, archived: true, assignable: false },
    ];
    vi.mocked(q.boardPeople).mockResolvedValue(people);
    const board = await s.getBoard(9, anna, false);
    expect(board).toMatchObject({ project: { id: 9, name: 'Marketing' }, people, oldDoneCount: 2 });
  });

  it('old done tasks only with oldDone: cutoff 30 days back, count only when hidden', async () => {
    await s.getBoard(9, jan, false);
    expect(q.boardTasks).toHaveBeenCalledWith(expect.anything(), 9, { includeOldDone: false, doneSince: new Date('2026-10-19T08:00:00Z') });
    expect(q.countOldDone).toHaveBeenCalledWith(expect.anything(), 9, new Date('2026-10-19T08:00:00Z'));
    vi.clearAllMocks();
    vi.mocked(q.findVisibleProject).mockResolvedValue({ id: 9, name: 'Marketing' });
    vi.mocked(q.boardTasks).mockResolvedValue([]);
    vi.mocked(q.assigneesOf).mockResolvedValue(new Map());
    const all = await s.getBoard(9, jan, true);
    expect(q.boardTasks).toHaveBeenCalledWith(expect.anything(), 9, { includeOldDone: true, doneSince: expect.any(Date) });
    expect(q.countOldDone).not.toHaveBeenCalled();
    expect(all).toMatchObject({ oldDoneCount: 0 });
  });

  it('board leaves: approved leaves of everyone on the board for the next 180 days (task form warning)', async () => {
    vi.mocked(q.boardPeople).mockResolvedValue([
      { id: 1, name: 'Anna Nowak', role: 'admin', archived: false, assignable: true },
      { id: 6, name: 'Piotr Zieliński', role: 'employee', archived: false, assignable: true },
    ]);
    vi.mocked(listApprovedLeaves).mockResolvedValue([{ userId: 6, dateFrom: '2026-12-21', dateTo: '2026-12-22' }]);
    const board = await s.getBoard(9, jan, false);
    expect(listApprovedLeaves).toHaveBeenCalledWith(expect.anything(), [1, 6], '2026-11-18', '2027-05-17');
    expect(board).toMatchObject({ leaves: [{ userId: 6, dateFrom: '2026-12-21', dateTo: '2026-12-22' }] });
  });

  it('leaves only for open tasks up to the due date or 14 days', async () => {
    vi.mocked(q.boardTasks).mockResolvedValue([
      row({ id: 7, dueDate: '2026-11-25' }),
      row({ id: 8, dueDate: null }),
      row({ id: 9, dueDate: '2026-11-10' }),
      row({ id: 10, column: 'done', dueDate: '2026-12-31', completedAt: '2026-11-17T10:00:00.000Z' }),
    ]);
    vi.mocked(q.assigneesOf).mockResolvedValue(new Map([[7, [5, 6]], [8, [6]], [9, [6]], [10, [6]]]));
    vi.mocked(listApprovedLeaves).mockResolvedValue([
      { userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' },
      { userId: 6, dateFrom: '2026-12-28', dateTo: '2026-12-31' },
    ]);
    const board = await s.getBoard(9, jan, false);
    expect(listApprovedLeaves).toHaveBeenCalledWith(expect.anything(), [5, 6], '2026-11-18', '2027-05-17');
    const byId = new Map(('tasks' in board ? board.tasks : []).map((t) => [t.id, t]));
    expect(byId.get(7)).toMatchObject({ assigneeIds: [5, 6], leaves: [{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }] });
    expect(byId.get(8)!.leaves).toEqual([{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }]);
    expect(byId.get(9)!.leaves).toEqual([]);
    expect(byId.get(10)!.leaves).toEqual([]);
  });

});

const people = [
  { id: 1, name: 'Anna Nowak', role: 'admin' as const, archived: false, assignable: true },
  { id: 5, name: 'Jan Kowalski', role: 'employee' as const, archived: false, assignable: true },
  { id: 6, name: 'Piotr Zieliński', role: 'employee' as const, archived: false, assignable: true },
  { id: 8, name: 'Ewa Mazur', role: 'employee' as const, archived: true, assignable: false },
];
const input = { title: 'Zamówić ulotki', description: null, dueDate: '2026-11-25', column: 'draft' as const, assigneeIds: [5, 6] };

describe('task writes', () => {
  beforeEach(() => {
    vi.mocked(q.boardPeople).mockResolvedValue(people);
    vi.mocked(q.insertTask).mockResolvedValue(40);
    vi.mocked(q.columnTaskIds).mockResolvedValue([11, 12]);
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'draft' }));
    vi.mocked(q.assigneesOf).mockResolvedValue(new Map([[7, [5]]]));
    vi.mocked(q.lockProject).mockResolvedValue(true);
  });

  // Jedna kolejność blokad (projekt, potem zadanie i kolumny): dwa przeciągnięcia naraz czekają, zamiast się zakleszczyć.
  it('every task write locks the project first, then the task and the columns', async () => {
    const order = () => [
      vi.mocked(q.lockProject).mock.invocationCallOrder[0]!,
      vi.mocked(q.columnTaskIds).mock.invocationCallOrder[0]!,
    ];
    vi.mocked(q.columnTaskIds).mockResolvedValue([7, 11]);
    await s.moveTask(7, { column: 'draft', beforeTaskId: 11 }, jan);
    expect(q.lockProject).toHaveBeenCalledWith(conn, 9);
    const lockedTask = vi.mocked(q.findTask).mock.calls.findIndex((c) => (c[3] as { lock?: boolean } | undefined)?.lock === true);
    expect(vi.mocked(q.findTask).mock.invocationCallOrder[lockedTask]!).toBeGreaterThan(vi.mocked(q.lockProject).mock.invocationCallOrder[0]!);
    const [lock, column] = order();
    expect(lock).toBeLessThan(column);
    for (const write of [() => s.updateTask(7, input, jan), () => s.archiveTask(7, jan), () => s.createTask(9, input, jan)]) {
      vi.mocked(q.lockProject).mockClear();
      await write();
      expect(q.lockProject).toHaveBeenCalledWith(conn, 9);
    }
  });

  it('project deleted in the meantime → 404, nothing written', async () => {
    vi.mocked(q.lockProject).mockResolvedValue(false);
    expect(await s.createTask(9, input, jan)).toEqual({ error: expect.objectContaining({ status: 404 }) });
    expect(await s.moveTask(7, { column: 'done', beforeTaskId: null }, jan)).toEqual({ error: expect.objectContaining({ status: 404 }) });
    expect(q.insertTask).not.toHaveBeenCalled();
    expect(q.setPositions).not.toHaveBeenCalled();
  });

  it('new task goes to the top of its column, author from the actor, assignees saved', async () => {
    expect(await s.createTask(9, input, jan)).toEqual({ id: 40 });
    expect(q.findVisibleProject).toHaveBeenCalledWith(conn, 9, jan);
    expect(q.columnTaskIds).toHaveBeenCalledWith(conn, 9, 'draft');
    expect(q.insertTask).toHaveBeenCalledWith(conn, {
      projectId: 9, title: 'Zamówić ulotki', description: null, dueDate: '2026-11-25', column: 'draft', completedAt: null, createdBy: 5, createdByName: 'Jan Kowalski',
    });
    expect(q.setPositions).toHaveBeenCalledWith(conn, [40, 11, 12]);
    expect(q.setAssignees).toHaveBeenCalledWith(conn, 40, [5, 6]);
  });

  it('new task straight into done gets completed_at now', async () => {
    await s.createTask(9, { ...input, column: 'done' }, jan);
    expect(q.insertTask).toHaveBeenCalledWith(conn, expect.objectContaining({ column: 'done', completedAt: new Date('2026-11-18T08:00:00Z') }));
  });

  it('task_assigned for the assignees (the author is skipped by notifyUsers), link opens the task; history create', async () => {
    await s.createTask(9, input, jan);
    expect(notifyUsers).toHaveBeenCalledWith(conn, {
      type: 'task_assigned', userIds: [5, 6], params: { task: 'Zamówić ulotki', dueDate: '2026-11-25' }, link: '/admin/tasks/9?task=40', actor: { id: 5, name: 'Jan Kowalski' },
    });
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'create', entityType: 'tasks', entityId: 40, userId: 5 }));
  });

  it('no due date → no dueDate parameter in the notification', async () => {
    await s.createTask(9, { ...input, dueDate: null }, jan);
    expect(notifyUsers).toHaveBeenCalledWith(conn, expect.objectContaining({ params: { task: 'Zamówić ulotki' } }));
  });

  it('project not visible → 404; assignee outside the project or archived → 400 on assigneeIds', async () => {
    vi.mocked(q.findVisibleProject).mockResolvedValueOnce(null);
    expect(await s.createTask(9, input, jan)).toEqual({ error: expect.objectContaining({ status: 404 }) });
    for (const ids of [[99], [8]]) {
      expect(await s.createTask(9, { ...input, assigneeIds: ids }, jan)).toEqual({
        error: expect.objectContaining({ status: 400, fields: { assigneeIds: 'tasks.assignee_not_allowed' } }),
      });
    }
    expect(q.insertTask).not.toHaveBeenCalled();
  });

  it('edit: task_assigned only for newly assigned people; an archived person already assigned may stay', async () => {
    vi.mocked(q.assigneesOf).mockResolvedValue(new Map([[7, [5, 8]]]));
    expect(await s.updateTask(7, { ...input, assigneeIds: [5, 8, 6] }, jan)).toEqual({ ok: true });
    expect(q.findTask).toHaveBeenCalledWith(conn, 7, jan, { lock: true });
    expect(q.updateTask).toHaveBeenCalledWith(conn, 7, { title: 'Zamówić ulotki', description: null, dueDate: '2026-11-25' });
    expect(q.setAssignees).toHaveBeenCalledWith(conn, 7, [5, 8, 6]);
    expect(notifyUsers).toHaveBeenCalledWith(conn, expect.objectContaining({ type: 'task_assigned', userIds: [6], link: '/admin/tasks/9?task=7' }));
    expect(q.setColumn).not.toHaveBeenCalled();
  });

  it('edit: task not found, archived or in a project the viewer cannot see → 404', async () => {
    vi.mocked(q.findTask).mockResolvedValue(null);
    expect(await s.updateTask(7, input, jan)).toEqual({ error: expect.objectContaining({ status: 404 }) });
    expect(q.updateTask).not.toHaveBeenCalled();
  });

  it('column change via edit puts the card on top and sets or clears completed_at', async () => {
    vi.mocked(q.columnTaskIds).mockImplementation(async (_db, _p, column) => (column === 'done' ? [21, 22] : [7, 11]));
    await s.updateTask(7, { ...input, column: 'done' }, jan);
    expect(q.setColumn).toHaveBeenCalledWith(conn, 7, 'done', new Date('2026-11-18T08:00:00Z'));
    expect(q.setPositions).toHaveBeenCalledWith(conn, [7, 21, 22]);
    expect(q.setPositions).toHaveBeenCalledWith(conn, [11]);
    vi.clearAllMocks();
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'done', completedAt: '2026-11-17T10:00:00.000Z' }));
    vi.mocked(q.assigneesOf).mockResolvedValue(new Map([[7, [5]]]));
    vi.mocked(q.boardPeople).mockResolvedValue(people);
    vi.mocked(q.columnTaskIds).mockResolvedValue([]);
    await s.updateTask(7, { ...input, column: 'in_progress' }, jan);
    expect(q.setColumn).toHaveBeenCalledWith(conn, 7, 'in_progress', null);
  });

  it('move inside a column: before another card, positions 1..n without gaps', async () => {
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'in_progress' }));
    vi.mocked(q.columnTaskIds).mockResolvedValue([11, 7, 12, 13]);
    expect(await s.moveTask(7, { column: 'in_progress', beforeTaskId: 11 }, jan)).toEqual({ ok: true });
    expect(q.setPositions).toHaveBeenCalledWith(conn, [7, 11, 12, 13]);
    expect(q.setColumn).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('move to another column at the end: completed_at set, old column renumbered, history status', async () => {
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'in_progress' }));
    vi.mocked(q.columnTaskIds).mockImplementation(async (_db, _p, column) => (column === 'done' ? [21] : [11, 7, 12]));
    await s.moveTask(7, { column: 'done', beforeTaskId: null }, jan);
    expect(q.setColumn).toHaveBeenCalledWith(conn, 7, 'done', new Date('2026-11-18T08:00:00Z'));
    expect(q.setPositions).toHaveBeenCalledWith(conn, [21, 7]);
    expect(q.setPositions).toHaveBeenCalledWith(conn, [11, 12]);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      action: 'status', entityType: 'tasks', entityId: 7, changes: { column_key: { before: 'in_progress', after: 'done' } },
    }));
  });

  it('move inside done keeps completed_at', async () => {
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'done', completedAt: '2026-11-01T10:00:00.000Z' }));
    vi.mocked(q.columnTaskIds).mockResolvedValue([21, 7]);
    await s.moveTask(7, { column: 'done', beforeTaskId: 21 }, jan);
    expect(q.setColumn).not.toHaveBeenCalled();
  });

  it('move: beforeTaskId not in the target column (other project, other column, archived) → 400', async () => {
    vi.mocked(q.findTask).mockResolvedValue(row({ id: 7, column: 'in_progress' }));
    vi.mocked(q.columnTaskIds).mockResolvedValue([11, 7]);
    expect(await s.moveTask(7, { column: 'in_progress', beforeTaskId: 99 }, jan)).toEqual({
      error: expect.objectContaining({ status: 400, message: 'tasks.before_task_invalid' }),
    });
    expect(await s.moveTask(7, { column: 'in_progress', beforeTaskId: 7 }, jan)).toEqual({ error: expect.objectContaining({ status: 400 }) });
    expect(q.setPositions).not.toHaveBeenCalled();
  });

  it('archive: by the actor, history archive; missing → 404', async () => {
    expect(await s.archiveTask(7, jan)).toEqual({ ok: true });
    expect(q.archiveTask).toHaveBeenCalledWith(conn, 7, 5);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ action: 'archive', entityType: 'tasks', entityId: 7 }));
    vi.mocked(q.findTask).mockResolvedValue(null);
    expect(await s.archiveTask(7, jan)).toEqual({ error: expect.objectContaining({ status: 404 }) });
  });

  it('history: edit writes changed fields and assignees before → after', async () => {
    await s.updateTask(7, { ...input, title: 'Nowy tytuł', assigneeIds: [6] }, jan);
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      action: 'update', entityType: 'tasks', entityId: 7,
      changes: expect.objectContaining({ title: { before: 'Oferta dla hurtowni', after: 'Nowy tytuł' }, assignee_ids: { before: [5], after: [6] } }),
    }));
  });
});
