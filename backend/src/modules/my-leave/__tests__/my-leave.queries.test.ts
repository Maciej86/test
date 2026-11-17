import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../my-leave.queries');
const { findOpenPoolOfUser } = await import('../../employees/employees.queries');
type Db = import('../my-leave.queries').Db;

type Call = [string, unknown[] | undefined];
const spyDb = (result: unknown = []) => {
  const calls: Call[] = [];
  const db = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [result]; }) };
  return { db: db as unknown as Db, calls, query: db.query };
};
const requestRow = (o: Record<string, unknown> = {}) => ({
  id: 21, leave_type_name: 'Wypoczynkowy', deducts_pool: 1, date_from: '2026-11-26', date_to: '2026-11-27', working_days: 2,
  days_from_carried: 0, days_from_annual: 2, pool_year: 2026, comment: null, status: 'pending', reject_reason: null,
  decided_by_name: null, decided_at: null, created_at: new Date('2026-11-16T08:12:00Z'), ...o,
});

describe('my leave queries', () => {
  it('every query of one person uses ? parameters and has user_id in WHERE', async () => {
    const { db, calls } = spyDb([]);
    await q.listRequests(db, 7, 2026);
    await q.listRequestYears(db, 7);
    await q.listBusy(db, 7, 2026);
    await q.sumTypeUsage(db, 7, 2026);
    await q.findOwnRequest(db, 21, 7);
    await q.setWithdrawn(db, 21, 7);
    for (const [sql, params] of calls) {
      expect(sql).toMatch(/user_id = \?/);
      expect(params).toContain(7);
      expect(sql).not.toMatch(/'pending'|'approved'/);
    }
    expect(calls[4]![1]).toEqual([21, 7]);
  });

  it('listRequests maps rows; pending first, then newest date', async () => {
    const { db, calls } = spyDb([requestRow({ deducts_pool: 0, comment: 'Ślub siostry.' })]);
    const items = await q.listRequests(db, 7, 2026);
    expect(calls[0]![0]).toMatch(/ORDER BY r\.status = \? DESC, r\.date_from DESC, r\.id DESC/);
    expect(calls[0]![1]).toEqual([7, 2026, 'pending']);
    expect(items[0]).toEqual({
      id: 21, leaveTypeName: 'Wypoczynkowy', deductsPool: false, dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2,
      daysFromCarried: 0, daysFromAnnual: 2, poolYear: 2026, comment: 'Ślub siostry.', status: 'pending', rejectReason: null,
      decidedByName: null, decidedAt: null, createdAt: '2026-11-16T08:12:00.000Z',
    });
  });

  it('busy and type usage count only pending and approved requests', async () => {
    const { db, calls } = spyDb([{ leave_type_id: 2, days: 3 }]);
    expect(await q.sumTypeUsage(db, 7, 2026)).toEqual(new Map([[2, 3]]));
    await q.listBusy(db, 7, 2026);
    for (const [, params] of calls) expect(params).toEqual([7, 2026, ['pending', 'approved']]);
  });

  it('insertRequest saves values counted by the server', async () => {
    const { db, calls } = spyDb({ insertId: 33 });
    const id = await q.insertRequest(db, {
      userId: 7, leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', workingDays: 7, daysFromCarried: 4, daysFromAnnual: 3, poolYear: 2026, comment: null,
    });
    expect(id).toBe(33);
    expect(calls[0]![1]).toEqual([7, 1, '2026-12-21', '2026-12-31', 7, 4, 3, 2026, null, 'pending']);
  });

  it('setWithdrawn changes only pending requests of this user and returns affected rows', async () => {
    const { db, calls } = spyDb({ affectedRows: 0 });
    expect(await q.setWithdrawn(db, 21, 7)).toBe(0);
    expect(calls[0]![0]).toMatch(/WHERE id = \? AND user_id = \? AND status = \?/);
    expect(calls[0]![1]).toEqual(['withdrawn', 21, 7, 'pending']);
  });

  it('sumPoolUsage: approved and pending days per user from saved columns; no users → no query', async () => {
    const { db, calls, query } = spyDb([{ user_id: 7, used_carried: '4', used_annual: '5', pending_carried: '0', pending_annual: '2' }]);
    expect(await q.sumPoolUsage(db, [7, 8], 2026)).toEqual(
      new Map([
        [7, { usedCarried: 4, usedAnnual: 5, pendingCarried: 0, pendingAnnual: 2 }],
        [8, { usedCarried: 0, usedAnnual: 0, pendingCarried: 0, pendingAnnual: 0 }],
      ]),
    );
    expect(calls[0]![1]).toEqual(['approved', 'approved', 'pending', 'pending', [7, 8], 2026, ['pending', 'approved']]);
    query.mockClear();
    expect(await q.sumPoolUsage(db, [], 2026)).toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });

  it('countPendingRequests counts pending requests of the pool year', async () => {
    const { db, calls } = spyDb([{ total: 2 }]);
    expect(await q.countPendingRequests(db, 2026)).toBe(2);
    expect(calls[0]![1]).toEqual([2026, 'pending']);
    // Odczyt z blokadą widzi wniosek zapisany przez inną transakcję w trakcie „Zamknij rok”.
    expect(calls[0]![0]).toMatch(/FOR SHARE$/);
  });

  it('countRequestsByLeaveType counts all requests per type', async () => {
    const { db, calls } = spyDb([{ leave_type_id: 1, total: 3 }, { leave_type_id: 2, total: 1 }]);
    expect(await q.countRequestsByLeaveType(db)).toEqual(new Map([[1, 3], [2, 1]]));
    expect(calls[0]![0]).toMatch(/GROUP BY leave_type_id/);
  });

  it('findOpenPoolOfUser locks the row FOR UPDATE when asked', async () => {
    const { db, calls } = spyDb([{ id: 1, user_id: 7, year: 2026, annual_days: 26, carried_days: 4, closed_at: null }]);
    expect(await findOpenPoolOfUser(db, 7, true)).toMatchObject({ year: 2026 });
    await findOpenPoolOfUser(db, 7, false);
    expect(calls[0]![0]).toMatch(/user_id = \? AND closed_at IS NULL .*FOR UPDATE$/);
    expect(calls[1]![0]).not.toMatch(/FOR UPDATE/);
    expect(calls[0]![1]).toEqual([7]);
  });
});

describe('my leave pdf query', () => {
  it('findOwnRequestForPdf filters by request id and user id and joins the employee name', async () => {
    const { db, calls } = spyDb([requestRow({ status: 'approved', employee_name: 'Jan Kowalski' })]);
    const row = await q.findOwnRequestForPdf(db, 21, 7);
    expect(calls[0]![0]).toMatch(/JOIN users u ON u\.id = r\.user_id/);
    expect(calls[0]![0]).toMatch(/r\.id = \? AND r\.user_id = \?/);
    expect(calls[0]![1]).toEqual([21, 7]);
    expect(row?.employee_name).toBe('Jan Kowalski');
    expect(await q.findOwnRequestForPdf(spyDb([]).db, 21, 7)).toBeNull();
  });
});
