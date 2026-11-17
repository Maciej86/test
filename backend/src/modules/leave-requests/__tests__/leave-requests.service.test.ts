import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEAVE_REQUESTS_MESSAGES as M } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (orig) => ({ ...(await orig<object>()), logActivity: vi.fn() }));
vi.mock('../leave-requests.queries', () => ({
  listRequests: vi.fn(),
  pendingSummary: vi.fn(),
  listRequestYears: vi.fn(),
  findRequest: vi.fn(),
  listOverlapping: vi.fn(),
  findOpenPools: vi.fn(),
  isPoolOpen: vi.fn(),
  setDecision: vi.fn(),
}));
vi.mock('../../employees/employees.service', () => ({ getPoolUsage: vi.fn() }));
vi.mock('../../leave-types/leave-types.queries', () => ({ listLeaveTypes: vi.fn() }));
vi.mock('../../notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));
vi.mock('../../../pdf/leaveRequestPdfData', async (orig) => ({ ...(await orig<object>()), findRequestForPdf: vi.fn() }));

const q = await import('../leave-requests.queries');
const { getPoolUsage } = await import('../../employees/employees.service');
const { listLeaveTypes } = await import('../../leave-types/leave-types.queries');
const { notifyUsers } = await import('../../notifications/notifications.service');
const { logActivity } = await import('../../../db/activityLog');
const s = await import('../leave-requests.service');

type Item = import('../leave-requests.queries').RequestItem;
const anna = { id: 1, name: 'Anna Nowak' };
const item = (o: Partial<Item> = {}): Item => ({
  id: 21, userId: 7, employeeName: 'Jan Kowalski', employeeArchived: false, leaveTypeName: 'Wypoczynkowy', deductsPool: true,
  dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2, daysFromCarried: 0, daysFromAnnual: 2, poolYear: 2026, comment: null,
  status: 'pending', decisionReason: null, decidedByName: null, decidedAt: null, createdAt: '2026-11-16T08:12:00.000Z', ...o,
});
const janPool = { id: 1, user_id: 7, year: 2026, annual_days: 26, carried_days: 4, closed_at: null } as never;

beforeEach(() => {
  vi.mocked(q.findOpenPools).mockResolvedValue(new Map([[7, janPool]]));
  vi.mocked(getPoolUsage).mockResolvedValue(new Map([[7, { usedDays: 9, pendingDays: 2, usedCarried: 4 }]]));
  vi.mocked(q.pendingSummary).mockResolvedValue({ count: 3, oldestAt: '2026-11-13T05:48:00.000Z' });
  vi.mocked(q.listRequestYears).mockResolvedValue([2025]);
  vi.mocked(listLeaveTypes).mockResolvedValue([{ id: 1, name: 'Wypoczynkowy' }] as never);
  vi.mocked(q.listOverlapping).mockResolvedValue([]);
  vi.mocked(q.isPoolOpen).mockResolvedValue(true);
  vi.mocked(q.setDecision).mockResolvedValue(1);
});
afterEach(() => vi.clearAllMocks());

describe('leave requests: list and details', () => {
  it('list items have poolLeft from the open pool (Jan: 19 of 30), null without a pool; summary, years, types', async () => {
    vi.mocked(q.listRequests).mockResolvedValue({ rows: [item(), item({ id: 5, userId: 8, employeeName: 'Ewa Mazur' })], total: 2 });
    const result = await s.listLeaveRequests({ status: 'pending', page: 1, search: '' });
    expect(q.listRequests).toHaveBeenCalledWith(expect.anything(), { status: 'pending', year: expect.any(Number), leaveTypeId: undefined, search: '', page: 1 });
    expect(getPoolUsage).toHaveBeenCalledWith([7], 2026);
    expect(result.items[0]).toMatchObject({ id: 21, employeeName: 'Jan Kowalski', poolLeft: { left: 19, total: 30 }, canCancel: false });
    expect(result.items[0]).not.toHaveProperty('userId');
    expect(result.items[1]!.poolLeft).toBeNull();
    expect(result).toMatchObject({ total: 2, page: 1, pageSize: 25, pendingCount: 3, oldestPendingAt: '2026-11-13T05:48:00.000Z', leaveTypes: [{ id: 1, name: 'Wypoczynkowy' }] });
    expect(result.years[0]).toBeGreaterThanOrEqual(2026);
    expect(result.years).toContain(2025);
  });

  it('canCancel only for approved requests whose pool year is still open', async () => {
    vi.mocked(q.listRequests).mockResolvedValue({
      rows: [item({ status: 'approved' }), item({ id: 3, status: 'approved', poolYear: 2025 }), item({ id: 4, status: 'rejected' }), item({ id: 6, userId: 8, status: 'approved' })],
      total: 4,
    });
    const { items } = await s.listLeaveRequests({ status: 'all', page: 1, search: '', year: 2026 });
    expect(items.map((i) => i.canCancel)).toEqual([true, false, false, false]);
  });

  it('details: 404 for a missing request', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(null);
    expect(await s.getLeaveRequest(99)).toEqual({ error: { status: 404, message: 'server.not_found' } });
  });

  it('details: pool of the request year and others for a pending request', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ dateFrom: '2026-12-21', dateTo: '2026-12-24' }));
    vi.mocked(q.listOverlapping).mockResolvedValue([{ employeeName: 'Tomasz Wójcik', dateFrom: '2026-12-21', dateTo: '2026-12-22', status: 'approved' }]);
    const details = await s.getLeaveRequest(21);
    if ('error' in details) throw new Error('expected details');
    expect(q.listOverlapping).toHaveBeenCalledWith(expect.anything(), { userId: 7, dateFrom: '2026-12-21', dateTo: '2026-12-24' });
    expect(details.others).toHaveLength(1);
    expect(details.pool).toEqual({ year: 2026, annualDays: 26, carriedDays: 4, used: 9, pending: 2, left: 19 });
  });

  it('details: no others for a decided request; no pool when the request year is closed', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ status: 'rejected', poolYear: 2025 }));
    const details = await s.getLeaveRequest(21);
    if ('error' in details) throw new Error('expected details');
    expect(q.listOverlapping).not.toHaveBeenCalled();
    expect(details.others).toEqual([]);
    expect(details.pool).toBeNull();
  });
});

describe('leave requests: decisions', () => {
  it('approve: pending → approved, decided by the actor, history entry and leave_approved notification', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item());
    expect(await s.approveRequest(21, anna)).toEqual({ ok: true });
    expect(q.findRequest).toHaveBeenCalledWith(conn, 21, { lock: true });
    expect(q.setDecision).toHaveBeenCalledWith(conn, 21, { from: 'pending', to: 'approved', actor: anna, reason: null });
    expect(logActivity).toHaveBeenCalledWith(conn, {
      userId: 1, userName: 'Anna Nowak', action: 'status', entityType: 'leave_requests', entityId: 21,
      changes: { status: { before: 'pending', after: 'approved' } },
    });
    expect(notifyUsers).toHaveBeenCalledWith(conn, {
      type: 'leave_approved', userIds: [7], params: { leaveType: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27' },
      link: '/admin/my-leave?year=2026', actor: anna,
    });
  });

  it('reject: pending → rejected with the reason, leave_rejected notification with reason', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item());
    expect(await s.rejectRequest(21, 'Inwentaryzacja.', anna)).toEqual({ ok: true });
    expect(q.setDecision).toHaveBeenCalledWith(conn, 21, { from: 'pending', to: 'rejected', actor: anna, reason: 'Inwentaryzacja.' });
    expect(vi.mocked(logActivity).mock.calls[0]![1].changes).toEqual({
      status: { before: 'pending', after: 'rejected' }, decision_reason: { before: null, after: 'Inwentaryzacja.' },
    });
    expect(vi.mocked(notifyUsers).mock.calls[0]![1]).toMatchObject({ type: 'leave_rejected', params: { reason: 'Inwentaryzacja.' } });
  });

  it('cancel: approved → cancelled with the reason, leave_cancelled notification with reason', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ status: 'approved', decidedByName: 'Marek Nowicki' }));
    expect(await s.cancelRequest(21, 'Przesunięty na styczeń.', anna)).toEqual({ ok: true });
    expect(q.isPoolOpen).toHaveBeenCalledWith(conn, 7, 2026);
    expect(q.setDecision).toHaveBeenCalledWith(conn, 21, { from: 'approved', to: 'cancelled', actor: anna, reason: 'Przesunięty na styczeń.' });
    expect(vi.mocked(notifyUsers).mock.calls[0]![1]).toMatchObject({ type: 'leave_cancelled', userIds: [7], params: { reason: 'Przesunięty na styczeń.' } });
  });

  it.each([
    ['approveRequest', 'approved'],
    ['approveRequest', 'withdrawn'],
    ['rejectRequest', 'rejected'],
    ['cancelRequest', 'cancelled'],
  ] as const)('%s on a %s request → 409 already_decided with status and decidedByName', async (fn, status) => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ status, decidedByName: status === 'withdrawn' ? null : 'Marek Nowicki' }));
    const result = await (s[fn] as (id: number, ...rest: unknown[]) => Promise<unknown>)(21, ...(fn === 'approveRequest' ? [anna] : ['Powód.', anna]));
    expect(result).toEqual({
      error: { status: 409, message: M.alreadyDecided, current: status, decidedByName: status === 'withdrawn' ? null : 'Marek Nowicki' },
    });
    expect(q.setDecision).not.toHaveBeenCalled();
    expect(notifyUsers).not.toHaveBeenCalled();
  });

  it('cancel of a request that is not approved → 409 not_approved; closed pool year → 409 year_closed', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ status: 'pending' }));
    expect(await s.cancelRequest(21, 'Powód.', anna)).toEqual({ error: { status: 409, message: M.notApproved } });
    vi.mocked(q.findRequest).mockResolvedValue(item({ status: 'approved' }));
    vi.mocked(q.isPoolOpen).mockResolvedValue(false);
    expect(await s.cancelRequest(21, 'Powód.', anna)).toEqual({ error: { status: 409, message: M.yearClosed, year: 2026 } });
    expect(q.setDecision).not.toHaveBeenCalled();
  });

  it('missing request → 404', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(null);
    expect(await s.approveRequest(99, anna)).toEqual({ error: { status: 404, message: 'server.not_found' } });
  });

  it('two approvals at once: one ok, one 409, one history entry, one notification', async () => {
    // Blokada wiersza: drugi odczyt widzi już stan po pierwszej decyzji.
    vi.mocked(q.findRequest).mockResolvedValueOnce(item()).mockResolvedValueOnce(item({ status: 'approved', decidedByName: 'Anna Nowak' }));
    const results = await Promise.all([s.approveRequest(21, anna), s.approveRequest(21, { id: 2, name: 'Marek Nowicki' })]);
    expect(results.filter((r) => 'ok' in (r as object))).toHaveLength(1);
    expect(results.filter((r) => 'error' in (r as object))).toHaveLength(1);
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(notifyUsers).toHaveBeenCalledTimes(1);
  });

  it('status changed between read and update (0 rows) → 409, nothing logged', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item());
    vi.mocked(q.setDecision).mockResolvedValue(0);
    expect(await s.approveRequest(21, anna)).toMatchObject({ error: { status: 409, message: M.alreadyDecided } });
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('request of an archived employee can be approved', async () => {
    vi.mocked(q.findRequest).mockResolvedValue(item({ employeeArchived: true }));
    expect(await s.approveRequest(21, anna)).toEqual({ ok: true });
  });
});

describe('leave requests: PDF', () => {
  it('any approved request → PDF; missing → 404; other status → 409 not_approved', async () => {
    const { findRequestForPdf } = await import('../../../pdf/leaveRequestPdfData');
    const row = {
      id: 21, employee_name: 'Jan Kowalski', leave_type_name: 'Wypoczynkowy', deducts_pool: 1, date_from: '2026-12-21', date_to: '2026-12-31',
      working_days: 7, days_from_carried: 2, days_from_annual: 5, pool_year: 2026, comment: null, status: 'approved',
      decided_by_name: 'Anna Nowak', decided_at: new Date('2026-12-02T09:00:00Z'), created_at: new Date('2026-11-17T09:00:00Z'),
    } as never;
    const find = vi.mocked(findRequestForPdf).mockResolvedValueOnce(row);
    const result = await s.getLeaveRequestPdf(21);
    expect(find).toHaveBeenCalledWith(expect.anything(), 21);
    if ('error' in result) throw new Error('expected a PDF');
    expect(result.pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
    find.mockResolvedValueOnce(null);
    expect(await s.getLeaveRequestPdf(21)).toEqual({ error: { status: 404, message: 'server.not_found' } });
    find.mockResolvedValueOnce({ ...(row as object), status: 'pending' } as never);
    expect(await s.getLeaveRequestPdf(21)).toEqual({ error: { status: 409, message: M.notApproved } });
  });
});
