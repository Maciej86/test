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
}));

const q = await import('../tasks.queries');
const { listApprovedLeaves } = await import('../../leave-requests/leave-requests.queries');
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
    expect(listApprovedLeaves).toHaveBeenCalledWith(expect.anything(), [5, 6], '2026-11-18', '2026-12-02');
    const byId = new Map(('tasks' in board ? board.tasks : []).map((t) => [t.id, t]));
    expect(byId.get(7)).toMatchObject({ assigneeIds: [5, 6], leaves: [{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }] });
    expect(byId.get(8)!.leaves).toEqual([{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }]);
    expect(byId.get(9)!.leaves).toEqual([]);
    expect(byId.get(10)!.leaves).toEqual([]);
  });

  it.todo('new task goes to the top of its column');
  it.todo('author comes from the actor, not the request');
  it.todo('task_assigned only for newly assigned people other than the author');
  it.todo('column change via edit puts the card on top and sets or clears completed_at');
  it.todo('move renumbers the column without gaps under a lock');
  it.todo('history entries for create, update, status and archive');
});
