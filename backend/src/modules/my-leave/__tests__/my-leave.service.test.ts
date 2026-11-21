import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  toRequest: vi.fn(),
}));
vi.mock('../../../pdf/leaveRequestPdfData', async (orig) => ({ ...(await orig<object>()), findRequestForPdf: vi.fn() }));
vi.mock('../../employees/employees.queries', () => ({ findOpenPoolOfUser: vi.fn() }));
vi.mock('../../leave-types/leave-types.queries', () => ({ listSelectableLeaveTypes: vi.fn(), findSelectableLeaveType: vi.fn() }));
vi.mock('../../notifications/notifications.service', () => ({ notifyAdmins: vi.fn() }));
vi.mock('../../../email/notifyAdmins', () => ({ emailAdminsAboutNewRequest: vi.fn() }));

const q = await import('../my-leave.queries');
const employees = await import('../../employees/employees.queries');
const leaveTypes = await import('../../leave-types/leave-types.queries');
const s = await import('../my-leave.service');
const { findRequestForPdf } = await import('../../../pdf/leaveRequestPdfData');
const { pool } = await import('../../../db/pool');
const { withTransaction } = await import('../../../db/transaction');
const { logActivity } = await import('../../../db/activityLog');
const { notifyAdmins } = await import('../../notifications/notifications.service');
const { emailAdminsAboutNewRequest } = await import('../../../email/notifyAdmins');
const { MY_LEAVE_MESSAGES: M } = await import('@app/shared');

const openPool = { id: 3, user_id: 7, year: 2026, annual_days: 26, carried_days: 4, closed_at: null } as never;
const usage = (o = {}) => new Map([[7, { usedCarried: 4, usedAnnual: 5, pendingCarried: 0, pendingAnnual: 2, ...o }]]);
const types = [
  { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, dayCount: 'working' as const, requiresApproval: true },
  { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, dayCount: 'working' as const, requiresApproval: true },
  { id: 3, name: 'Okolicznościowy', deductsPool: false, yearlyLimit: null, dayCount: 'working' as const, requiresApproval: true },
];
/** Chorobowe: dni kalendarzowe, bez zatwierdzania, nie odejmuje dni z puli. */
const sick = { id: 7, name: 'Chorobowe', deductsPool: false, yearlyLimit: null, dayCount: 'calendar' as const, requiresApproval: false };

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

  it('list: every request gets canWithdraw counted by the server (today in the app time zone)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    const base = { dateFrom: '2026-11-12', createdAt: '2026-11-10T08:00:00.000Z' };
    vi.mocked(q.listRequests).mockResolvedValueOnce([
      { id: 1, status: 'pending', autoApproved: false, ...base },
      { id: 2, status: 'approved', autoApproved: true, ...base },
      { id: 3, status: 'approved', autoApproved: true, ...base, createdAt: '2026-11-17T07:00:00.000Z' },
      { id: 4, status: 'approved', autoApproved: false, ...base, dateFrom: '2026-12-01' },
    ] as never);
    const { items } = await s.listMyRequests(7, 2026);
    expect(items.map((i) => [i.id, i.canWithdraw])).toEqual([[1, true], [2, false], [3, true], [4, false]]);
    vi.useRealTimers();
  });

  it('list: requests of the asked year, or of the open year by default', async () => {
    expect(await s.listMyRequests(7, 2025)).toEqual({ year: 2025, items: [] });
    expect(q.listRequests).toHaveBeenCalledWith(pool, 7, 2025);
    expect(await s.listMyRequests(7)).toEqual({ year: 2026, items: [] });
    expect(q.listRequests).toHaveBeenLastCalledWith(pool, 7, 2026);
  });
});

describe('my leave service: create', () => {
  const jan = { id: 7, name: 'Jan Kowalski' };
  const input = { leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', comment: 'Święta u rodziców.' };
  const saved = { id: 33, leaveTypeName: 'Wypoczynkowy' } as never;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValue(types[0]!);
    vi.mocked(q.sumPoolUsage).mockResolvedValue(usage({ usedCarried: 0, usedAnnual: 0, pendingAnnual: 0 }));
    vi.mocked(q.sumTypeUsage).mockResolvedValue(new Map());
    vi.mocked(q.insertRequest).mockResolvedValue(33);
    vi.mocked(q.findOwnRequest).mockResolvedValue({ id: 33 } as never);
    vi.mocked(q.toRequest).mockReturnValue(saved);
    vi.mocked(q.insertRequest).mockClear();
    vi.mocked(emailAdminsAboutNewRequest).mockResolvedValue(1);
  });
  afterEach(() => vi.useRealTimers());

  it('locks the pool row before counting (FOR UPDATE), all in one transaction', async () => {
    expect(await s.createRequest(input, jan)).toMatchObject(saved);
    expect(employees.findOpenPoolOfUser).toHaveBeenCalledWith(conn, 7, true);
    const lockOrder = vi.mocked(employees.findOpenPoolOfUser).mock.invocationCallOrder[0]!;
    expect(lockOrder).toBeLessThan(vi.mocked(q.sumPoolUsage).mock.invocationCallOrder[0]!);
    expect(lockOrder).toBeLessThan(vi.mocked(q.listBusy).mock.invocationCallOrder[0]!);
    expect(q.sumPoolUsage).toHaveBeenCalledWith(conn, [7], 2026);
    expect(q.listBusy).toHaveBeenCalledWith(conn, 7, 2026);
    expect(q.sumTypeUsage).toHaveBeenCalledWith(conn, 7, 2026);
  });

  it('no open pool → 404 no_pool; hidden or missing type → 400 field leaveTypeId', async () => {
    vi.mocked(employees.findOpenPoolOfUser).mockResolvedValueOnce(null);
    expect(await s.createRequest(input, jan)).toEqual({ error: { status: 404, message: M.noPool } });
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValueOnce(null);
    expect(await s.createRequest({ ...input, leaveTypeId: 9 }, jan)).toEqual({
      error: { status: 400, message: M.typeUnavailable, fields: { leaveTypeId: M.typeUnavailable } },
    });
    expect(leaveTypes.findSelectableLeaveType).toHaveBeenLastCalledWith(9, conn);
    expect(q.insertRequest).not.toHaveBeenCalled();
  });

  it('past date → 400 field dateFrom past_date (server today); other checks → 409 with data', async () => {
    expect(await s.createRequest({ ...input, dateFrom: '2026-11-16', dateTo: '2026-11-18' }, jan)).toEqual({
      error: { status: 400, message: M.pastDate, fields: { dateFrom: M.pastDate } },
    });
    expect(await s.createRequest({ ...input, dateFrom: '2027-01-11', dateTo: '2027-01-15' }, jan)).toEqual({
      error: { status: 409, message: M.poolNotReady, year: 2027, openYear: 2026 },
    });
    expect(await s.createRequest({ ...input, dateFrom: '2026-11-21', dateTo: '2026-11-22' }, jan)).toEqual({
      error: { status: 409, message: M.noWorkingDays },
    });
    const other = { dateFrom: '2026-12-31', dateTo: '2026-12-31', leaveTypeName: 'Wypoczynkowy', status: 'approved' as const };
    vi.mocked(q.listBusy).mockResolvedValueOnce([other]);
    expect(await s.createRequest(input, jan)).toEqual({ error: { status: 409, message: M.overlap, other } });
    vi.mocked(q.sumPoolUsage).mockResolvedValueOnce(usage({ usedCarried: 4, usedAnnual: 20, pendingAnnual: 3 }));
    expect(await s.createRequest(input, jan)).toEqual({ error: { status: 409, message: M.notEnoughDays, days: 7, left: 3, pending: 3 } });
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValueOnce(types[1]!);
    vi.mocked(q.sumTypeUsage).mockResolvedValueOnce(new Map([[2, 1]]));
    expect(await s.createRequest({ ...input, leaveTypeId: 2 }, jan)).toEqual({
      error: { status: 409, message: M.limitExceeded, leaveType: 'Na żądanie', limit: 4, used: 1, days: 7 },
    });
    expect(q.insertRequest).not.toHaveBeenCalled();
  });

  it('server counts days and split, user id and pool year from the server', async () => {
    await s.createRequest(input, jan);
    expect(q.insertRequest).toHaveBeenCalledWith(conn, {
      userId: 7, leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', dayCount: 'working', workingDays: 7, daysFromCarried: 4, daysFromAnnual: 3,
      poolYear: 2026, comment: 'Święta u rodziców.', autoApproved: false,
    });
    expect(q.findOwnRequest).toHaveBeenCalledWith(conn, 33, 7);
  });

  it('logs activity and notifies admins in the transaction, e-mail after it with leftAfter', async () => {
    await s.createRequest(input, jan);
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 7, userName: 'Jan Kowalski', action: 'create', entityType: 'leave_requests', entityId: 33,
      entityName: 'Jan Kowalski', entityContext: { leaveType: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-31', days: 7 },
      changes: {
        leave_type: { before: undefined, after: 'Wypoczynkowy' },
        date_from: { before: undefined, after: '2026-12-21' },
        date_to: { before: undefined, after: '2026-12-31' },
        working_days: { before: undefined, after: 7 },
        days_from_carried: { before: undefined, after: 4 },
        days_from_annual: { before: undefined, after: 3 },
      },
    });
    expect(notifyAdmins).toHaveBeenCalledWith(conn, {
      type: 'leave_request_new',
      params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2026-12-21', dateTo: '2026-12-31', days: 7, dayCount: 'working' },
      link: '/admin/leave-requests/33',
      actor: jan,
    });
    expect(emailAdminsAboutNewRequest).toHaveBeenCalledWith({
      requestId: 33, employeeName: 'Jan Kowalski', leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-12-21', dateTo: '2026-12-31',
      workingDays: 7, dayCount: 'working', autoApproved: false, daysFromCarried: 4, daysFromAnnual: 3, leftAfter: 23, comment: 'Święta u rodziców.',
    });
    const committed = vi.mocked(withTransaction).mock.results[0]!.value as Promise<unknown>;
    await committed;
    expect(vi.mocked(emailAdminsAboutNewRequest).mock.invocationCallOrder[0]!).toBeGreaterThan(vi.mocked(notifyAdmins).mock.invocationCallOrder[0]!);
  });

  it('no e-mail when the request was refused', async () => {
    await s.createRequest({ ...input, dateFrom: '2026-11-21', dateTo: '2026-11-22' }, jan);
    expect(emailAdminsAboutNewRequest).not.toHaveBeenCalled();
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it('type without approval: saved as approved (auto), weekend counted, admins get "absence reported" and the e-mail', async () => {
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValue(sick);
    await s.createRequest({ leaveTypeId: 7, dateFrom: '2026-11-13', dateTo: '2026-11-19', comment: null }, jan);
    expect(q.insertRequest).toHaveBeenCalledWith(conn, expect.objectContaining({ dayCount: 'calendar', workingDays: 7, daysFromCarried: 0, daysFromAnnual: 0, autoApproved: true }));
    expect(notifyAdmins).toHaveBeenCalledWith(conn, {
      type: 'leave_absence_reported',
      params: { employee: 'Jan Kowalski', leaveType: 'Chorobowe', dateFrom: '2026-11-13', dateTo: '2026-11-19', days: 7, dayCount: 'calendar' },
      link: '/admin/leave-requests/33',
      actor: jan,
    });
    expect(emailAdminsAboutNewRequest).toHaveBeenCalledWith(expect.objectContaining({ autoApproved: true, dayCount: 'calendar', workingDays: 7, leftAfter: null }));
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({
      action: 'create',
      changes: expect.objectContaining({ day_count: { before: undefined, after: 'calendar' }, status: { before: undefined, after: 'approved' }, auto_approved: { before: undefined, after: true } }),
    }));
  });

  it('type without approval may start 7 days ago (server today); 8 days ago → 400 past_date', async () => {
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValue(sick);
    expect(await s.createRequest({ leaveTypeId: 7, dateFrom: '2026-11-10', dateTo: '2026-11-18', comment: null }, jan)).toMatchObject(saved);
    expect(await s.createRequest({ leaveTypeId: 7, dateFrom: '2026-11-09', dateTo: '2026-11-18', comment: null }, jan)).toEqual({
      error: { status: 400, message: M.pastDate, fields: { dateFrom: M.pastDate } },
    });
  });

  it('type without approval overlapping an approved leave → 409 overlap, nothing saved', async () => {
    vi.mocked(leaveTypes.findSelectableLeaveType).mockResolvedValue(sick);
    const other = { dateFrom: '2026-11-16', dateTo: '2026-11-20', leaveTypeName: 'Wypoczynkowy', status: 'approved' as const };
    vi.mocked(q.listBusy).mockResolvedValueOnce([other]);
    expect(await s.createRequest({ leaveTypeId: 7, dateFrom: '2026-11-13', dateTo: '2026-11-17', comment: null }, jan)).toEqual({ error: { status: 409, message: M.overlap, other } });
    expect(q.insertRequest).not.toHaveBeenCalled();
  });

  it('e-mail error does not break the answer', async () => {
    vi.mocked(emailAdminsAboutNewRequest).mockRejectedValueOnce(new Error('smtp down'));
    expect(await s.createRequest(input, jan)).toMatchObject(saved);
  });
});

describe('my leave service: withdraw', () => {
  const jan = { id: 7, name: 'Jan Kowalski' };
  const pendingRow = {
    id: 21, user_id: 7, leave_type_name: 'Wypoczynkowy', date_from: '2026-11-26', date_to: '2026-11-27', working_days: 2, status: 'pending',
    auto_approved: 0, created_at: new Date('2026-11-10T08:00:00Z'),
  } as never;
  const autoRow = (o: Record<string, unknown>) => ({ ...(pendingRow as object), leave_type_name: 'Chorobowe', status: 'approved', auto_approved: 1, ...o }) as never;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    vi.mocked(q.findOwnRequest).mockResolvedValue(pendingRow);
    vi.mocked(q.setWithdrawn).mockResolvedValue(1);
  });
  afterEach(() => vi.useRealTimers());

  it('auto-approved before its first day → withdrawn (UPDATE only while still approved), admins notified', async () => {
    vi.mocked(q.findOwnRequest).mockResolvedValueOnce(autoRow({ date_from: '2026-11-18', date_to: '2026-11-20' }));
    expect(await s.withdrawRequest(21, jan)).toEqual({ ok: true });
    expect(q.setWithdrawn).toHaveBeenCalledWith(conn, 21, 7, 'approved');
    expect(logActivity).toHaveBeenCalledWith(conn, expect.objectContaining({ changes: { status: { before: 'approved', after: 'withdrawn' } } }));
    expect(notifyAdmins).toHaveBeenCalledWith(conn, expect.objectContaining({ type: 'leave_request_withdrawn' }));
  });

  it('auto-approved filed today, started in the past → withdrawn; filed earlier and started → 409 cannot_withdraw', async () => {
    vi.mocked(q.findOwnRequest).mockResolvedValueOnce(autoRow({ date_from: '2026-11-12', created_at: new Date('2026-11-17T06:00:00Z') }));
    expect(await s.withdrawRequest(21, jan)).toEqual({ ok: true });
    vi.mocked(q.setWithdrawn).mockClear();
    vi.mocked(q.findOwnRequest).mockResolvedValueOnce(autoRow({ date_from: '2026-11-12' }));
    expect(await s.withdrawRequest(21, jan)).toEqual({ error: { status: 409, message: M.cannotWithdraw } });
    expect(q.setWithdrawn).not.toHaveBeenCalled();
  });

  it('approved by an administrator → 409 cannot_withdraw (only the administrator cancels it)', async () => {
    vi.mocked(q.findOwnRequest).mockResolvedValueOnce(autoRow({ auto_approved: 0, date_from: '2026-12-01' }));
    expect(await s.withdrawRequest(21, jan)).toEqual({ error: { status: 409, message: M.cannotWithdraw } });
    expect(q.setWithdrawn).not.toHaveBeenCalled();
  });

  it('foreign or missing request → 404 (looked up with the user id)', async () => {
    vi.mocked(q.findOwnRequest).mockResolvedValue(null);
    expect(await s.withdrawRequest(21, jan)).toEqual({ error: { status: 404, message: 'server.not_found' } });
    expect(q.findOwnRequest).toHaveBeenCalledWith(conn, 21, 7);
    expect(q.setWithdrawn).not.toHaveBeenCalled();
  });

  it('rejected → 409 cannot_withdraw; second withdraw at the same time → 409', async () => {
    vi.mocked(q.findOwnRequest).mockResolvedValueOnce({ ...(pendingRow as object), status: 'rejected' } as never);
    expect(await s.withdrawRequest(21, jan)).toEqual({ error: { status: 409, message: M.cannotWithdraw } });
    expect(q.setWithdrawn).not.toHaveBeenCalled();
    vi.mocked(q.setWithdrawn).mockResolvedValueOnce(0);
    expect(await s.withdrawRequest(21, jan)).toEqual({ error: { status: 409, message: M.cannotWithdraw } });
    expect(logActivity).not.toHaveBeenCalled();
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it('pending → withdrawn, activity and notification in the transaction', async () => {
    expect(await s.withdrawRequest(21, jan)).toEqual({ ok: true });
    expect(q.setWithdrawn).toHaveBeenCalledWith(conn, 21, 7, 'pending');
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 7, userName: 'Jan Kowalski', action: 'status', entityType: 'leave_requests', entityId: 21,
      entityName: 'Jan Kowalski', entityContext: { leaveType: 'Wypoczynkowy', from: '2026-11-26', to: '2026-11-27', days: 2 },
      changes: { status: { before: 'pending', after: 'withdrawn' } },
    });
    expect(notifyAdmins).toHaveBeenCalledWith(conn, {
      type: 'leave_request_withdrawn',
      params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27' },
      link: '/admin/leave-requests/21',
      actor: jan,
    });
  });
});

describe('getRequestPdf', () => {
  const approved = {
    id: 21, user_id: 7, leave_type_name: 'Wypoczynkowy', deducts_pool: 1, date_from: '2026-12-21', date_to: '2026-12-31',
    working_days: 7, days_from_carried: 2, days_from_annual: 5, pool_year: 2026, comment: null, status: 'approved',
    decided_by_name: 'Anna Nowak', decided_at: new Date('2026-12-02T09:00:00Z'), created_at: new Date('2026-11-17T09:00:00Z'),
    employee_name: 'Jan Kowalski',
  } as never;

  it('own approved request → file name and PDF, looked up with req.user id', async () => {
    vi.mocked(findRequestForPdf).mockResolvedValue(approved);
    const result = await s.getRequestPdf(21, 7);
    expect(findRequestForPdf).toHaveBeenCalledWith(pool, 21, 7);
    if ('error' in result) throw new Error('expected a PDF');
    expect(result.fileName).toBe('wniosek-urlopowy-21.pdf');
    expect(result.pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('someone else or missing → 404', async () => {
    vi.mocked(findRequestForPdf).mockResolvedValue(null);
    expect(await s.getRequestPdf(21, 7)).toEqual({ error: { status: 404, message: 'server.not_found' } });
  });

  it.each(['pending', 'rejected', 'withdrawn', 'cancelled'])('%s → 409 not_approved', async (status) => {
    vi.mocked(findRequestForPdf).mockResolvedValue({ ...(approved as object), status } as never);
    expect(await s.getRequestPdf(21, 7)).toEqual({ error: { status: 409, message: M.notApproved } });
  });
});
