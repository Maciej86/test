import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../my-leave.queries', () => ({
  listRequests: vi.fn(),
  listRequestYears: vi.fn(),
  listBusy: vi.fn(),
  sumTypeUsage: vi.fn(),
  sumPoolUsage: vi.fn(),
  insertRequest: vi.fn(),
  findOwnRequest: vi.fn(),
  setWithdrawn: vi.fn(),
}));
vi.mock('../../employees/employees.queries', () => ({ findOpenPoolOfUser: vi.fn() }));
vi.mock('../../leave-types/leave-types.queries', () => ({ listSelectableLeaveTypes: vi.fn(), findSelectableLeaveType: vi.fn() }));
vi.mock('../../notifications/notifications.service', () => ({ notifyAdmins: vi.fn() }));
vi.mock('../../../email/notifyAdmins', () => ({ emailAdminsAboutNewRequest: vi.fn() }));

const q = await import('../my-leave.queries');
const employees = await import('../../employees/employees.queries');
const leaveTypes = await import('../../leave-types/leave-types.queries');
const s = await import('../my-leave.service');
const { pool } = await import('../../../db/pool');

const openPool = { id: 3, user_id: 7, year: 2026, annual_days: 26, carried_days: 4, closed_at: null } as never;
const usage = (o = {}) => new Map([[7, { usedCarried: 4, usedAnnual: 5, pendingCarried: 0, pendingAnnual: 2, ...o }]]);
const types = [
  { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null },
  { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4 },
  { id: 3, name: 'Okolicznościowy', deductsPool: false, yearlyLimit: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(employees.findOpenPoolOfUser).mockResolvedValue(openPool);
  vi.mocked(q.sumPoolUsage).mockResolvedValue(usage());
  vi.mocked(q.sumTypeUsage).mockResolvedValue(new Map([[2, 1]]));
  vi.mocked(q.listRequestYears).mockResolvedValue([2025]);
  vi.mocked(q.listBusy).mockResolvedValue([]);
  vi.mocked(q.listRequests).mockResolvedValue([]);
  vi.mocked(leaveTypes.listSelectableLeaveTypes).mockResolvedValue(types);
});

describe('my leave service: overview and list', () => {
  it('overview: leftDays = annual + carried − approved − pending; leftCarriedDays', async () => {
    const overview = await s.getMyLeaveOverview(7);
    expect(overview?.pool).toEqual({
      year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 5, pendingDays: 2, pendingCarried: 0, leftDays: 19, leftCarriedDays: 0,
    });
    expect(employees.findOpenPoolOfUser).toHaveBeenCalledWith(pool, 7, false);
    expect(q.sumPoolUsage).toHaveBeenCalledWith(pool, [7], 2026);
  });

  it('overview: usedOfLimit per type, years include the open year, busy of the open year', async () => {
    const busy = [{ dateFrom: '2026-11-26', dateTo: '2026-11-27', leaveTypeName: 'Wypoczynkowy', status: 'pending' as const }];
    vi.mocked(q.listBusy).mockResolvedValue(busy);
    const overview = await s.getMyLeaveOverview(7);
    expect(overview?.types).toEqual([
      { ...types[0], usedOfLimit: 0 },
      { ...types[1], usedOfLimit: 1 },
      { ...types[2], usedOfLimit: 0 },
    ]);
    expect(overview?.years).toEqual([2026, 2025]);
    expect(overview?.busy).toBe(busy);
    expect(q.listBusy).toHaveBeenCalledWith(pool, 7, 2026);
  });

  it('overview: pending carried days count in leftCarriedDays; never below 0', async () => {
    vi.mocked(q.sumPoolUsage).mockResolvedValue(usage({ usedCarried: 1, pendingCarried: 2, usedAnnual: 40 }));
    const overview = await s.getMyLeaveOverview(7);
    expect(overview?.pool.leftCarriedDays).toBe(1);
    expect(overview?.pool.leftDays).toBe(0);
  });

  it('overview without open pool → null', async () => {
    vi.mocked(employees.findOpenPoolOfUser).mockResolvedValue(null);
    expect(await s.getMyLeaveOverview(7)).toBeNull();
  });

  it('list: requests of the asked year, or of the open year by default', async () => {
    expect(await s.listMyRequests(7, 2025)).toEqual({ year: 2025, items: [] });
    expect(q.listRequests).toHaveBeenCalledWith(pool, 7, 2025);
    expect(await s.listMyRequests(7)).toEqual({ year: 2026, items: [] });
    expect(q.listRequests).toHaveBeenLastCalledWith(pool, 7, 2026);
  });
});

describe('my leave service: create', () => {
  it.todo('locks the pool row before counting (FOR UPDATE)');
  it.todo('no open pool → 404; hidden or missing type → 400 field leaveTypeId');
  it.todo('past date → 400 field dateFrom past_date; other checks → 409 with data');
  it.todo('server counts days and split, user id from actor');
  it.todo('logs activity and notifies admins in the transaction, e-mail after it');
  it.todo('e-mail error does not break the answer');
});

describe('my leave service: withdraw', () => {
  it.todo('foreign or missing request → 404');
  it.todo('not pending → 409 not_pending; second withdraw → 409');
  it.todo('pending → withdrawn, activity and notification');
});
