import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('@app/shared', async (orig) => ({ ...(await orig<object>()), todayIsoDate: vi.fn(() => '2026-11-20') }));
vi.mock('../../leave-requests/leave-requests.queries', () => ({ listPendingForDashboard: vi.fn(), listAbsences: vi.fn() }));
vi.mock('../../my-leave/my-leave.queries', () => ({ listUpcomingOwn: vi.fn() }));
vi.mock('../../my-leave/my-leave.service', () => ({ getMyLeaveOverview: vi.fn() }));
vi.mock('../../tasks/tasks.queries', () => ({ projectTaskCounts: vi.fn(), listOverdueTasks: vi.fn(), listMyOpenTasks: vi.fn() }));

const { pool } = await import('../../../db/pool');
const lr = await import('../../leave-requests/leave-requests.queries');
const ml = await import('../../my-leave/my-leave.queries');
const mls = await import('../../my-leave/my-leave.service');
const tq = await import('../../tasks/tasks.queries');
const { getDashboard } = await import('../dashboard.service');

const anna = { id: 1, name: 'Anna Nowak', role: 'admin' as const };
const jan = { id: 2, name: 'Jan Kowalski', role: 'employee' as const };
const list = { items: [], total: 0 };
const pool2026 = { year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 8, pendingDays: 2, pendingCarried: 0, leftDays: 16, leftCarriedDays: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lr.listPendingForDashboard).mockResolvedValue(list);
  vi.mocked(lr.listAbsences).mockResolvedValue([]);
  vi.mocked(tq.projectTaskCounts).mockResolvedValue([]);
  vi.mocked(tq.listOverdueTasks).mockResolvedValue(list);
  vi.mocked(tq.listMyOpenTasks).mockResolvedValue(list);
  vi.mocked(ml.listUpcomingOwn).mockResolvedValue({ pending: [], nextApproved: null });
  vi.mocked(mls.getMyLeaveOverview).mockResolvedValue({ pool: pool2026, types: [], years: [2026], busy: [] });
});

describe('dashboard service', () => {
  it('today comes from todayIsoDate(); absences cover today and 13 more days', async () => {
    const result = await getDashboard(anna);
    expect(result.today).toBe('2026-11-20');
    expect(lr.listAbsences).toHaveBeenCalledWith(pool, '2026-11-20', '2026-12-03');
  });

  it('admin: lists limited to DASHBOARD_BOX_LIMIT with total; doneSince = now − TASK_HIDE_DONE_AFTER_DAYS (as on the board)', async () => {
    const result = await getDashboard(anna);
    expect(result).toEqual({ role: 'admin', today: '2026-11-20', pending: list, absences: [], projects: [], overdue: list, myTasks: list });
    expect(lr.listPendingForDashboard).toHaveBeenCalledWith(pool, 5);
    expect(tq.listOverdueTasks).toHaveBeenCalledWith(pool, '2026-11-20', 5);
    expect(tq.listMyOpenTasks).toHaveBeenCalledWith(pool, anna, 5);
    // Ta sama granica co na tablicy projektu: teraz − 30 dni.
    const doneSince = vi.mocked(tq.projectTaskCounts).mock.calls[0]![2];
    expect(Math.abs(Date.now() - 30 * 24 * 3600 * 1000 - doneSince.getTime())).toBeLessThan(60_000);
    expect(ml.listUpcomingOwn).not.toHaveBeenCalled();
    expect(mls.getMyLeaveOverview).not.toHaveBeenCalled();
  });

  it('employee: own pool, own pending and next approved, own tasks (viewer id)', async () => {
    const next = { id: 19, leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-12-21', dateTo: '2026-12-23', workingDays: 3 };
    vi.mocked(ml.listUpcomingOwn).mockResolvedValue({ pending: [], nextApproved: next });
    const result = await getDashboard(jan);
    expect(result).toEqual({ role: 'employee', today: '2026-11-20', pool: pool2026, myPending: [], nextLeave: next, myTasks: list });
    expect(ml.listUpcomingOwn).toHaveBeenCalledWith(pool, 2, '2026-11-20');
    expect(mls.getMyLeaveOverview).toHaveBeenCalledWith(2);
    expect(tq.listMyOpenTasks).toHaveBeenCalledWith(pool, jan, 5);
    expect(lr.listPendingForDashboard).not.toHaveBeenCalled();
    expect(lr.listAbsences).not.toHaveBeenCalled();
    expect(tq.projectTaskCounts).not.toHaveBeenCalled();
    expect(tq.listOverdueTasks).not.toHaveBeenCalled();
  });

  it('employee without a pool → pool: null', async () => {
    vi.mocked(mls.getMyLeaveOverview).mockResolvedValue(null);
    const result = await getDashboard(jan);
    expect(result.role === 'employee' && result.pool).toBeNull();
  });
});
