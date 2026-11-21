import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../my-leave.queries');
const { findOpenPoolOfUser } = await import('../../employees/employees.queries');

type Call = [string, unknown[] | undefined];
const spyDb = (result: unknown = []) => {
  const calls: Call[] = [];
  const db = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [result]; }) };
  return { db: db as unknown as Db, calls, query: db.query };
};
const requestRow = (o: Record<string, unknown> = {}) => ({
  id: 21, leave_type_name: 'Wypoczynkowy', deducts_pool: 1, date_from: '2026-11-26', date_to: '2026-11-27', working_days: 2,
  days_from_carried: 0, days_from_annual: 2, pool_year: 2026, comment: null, status: 'pending', decision_reason: null,
  decided_by_name: null, decided_at: null, created_at: new Date('2026-11-16T08:12:00Z'), day_count: 'working', auto_approved: 0, ...o,
});

describe('my leave queries', () => {
  it('every query of one person uses ? parameters and has user_id in WHERE', async () => {
    const { db, calls } = spyDb([]);
    await q.listRequests(db, 7, 2026);
    await q.listRequestYears(db, 7);
    await q.listBusy(db, 7, 2026);
    await q.sumTypeUsage(db, 7, 2026);
    await q.findOwnRequest(db, 21, 7);
    await q.setWithdrawn(db, 21, 7, 'pending');
    for (const [sql, params] of calls) {
      expect(sql).toMatch(/user_id = \?/);
      expect(params).toContain(7);
      expect(sql).not.toMatch(/'pending'|'approved'/);
    }
    expect(calls[4]![1]).toEqual([21, 7]);
  });

  it('listRequests maps rows; pending first, then newest date', async () => {
    const { db, calls } = spyDb([requestRow({ deducts_pool: 0, comment: 'Ślub siostry.', day_count: 'calendar', auto_approved: 1 })]);
    const items = await q.listRequests(db, 7, 2026);
    expect(calls[0]![0]).toMatch(/ORDER BY r\.status = \? DESC, r\.date_from DESC, r\.id DESC/);
    expect(calls[0]![1]).toEqual([7, 2026, 'pending']);
    expect(items[0]).toEqual({
      id: 21, leaveTypeName: 'Wypoczynkowy', deductsPool: false, dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2,
      daysFromCarried: 0, daysFromAnnual: 2, poolYear: 2026, comment: 'Ślub siostry.', status: 'pending', decisionReason: null,
      decidedByName: null, decidedAt: null, createdAt: '2026-11-16T08:12:00.000Z', dayCount: 'calendar', autoApproved: true,
    });
  });

  it('busy and type usage count only pending and approved requests', async () => {
    const { db, calls } = spyDb([{ leave_type_id: 2, days: 3 }]);
    expect(await q.sumTypeUsage(db, 7, 2026)).toEqual(new Map([[2, 3]]));
    await q.listBusy(db, 7, 2026);
    for (const [, params] of calls) expect(params).toEqual([7, 2026, ['pending', 'approved']]);
  });

  it('insertRequest saves values counted by the server: pending, without decision time', async () => {
    const { db, calls } = spyDb({ insertId: 33 });
    const id = await q.insertRequest(db, {
      userId: 7, leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', dayCount: 'working', workingDays: 7, daysFromCarried: 4, daysFromAnnual: 3,
      poolYear: 2026, comment: null, autoApproved: false,
    });
    expect(id).toBe(33);
    expect(calls[0]![1]).toEqual([7, 1, '2026-12-21', '2026-12-31', 'working', 7, 4, 3, 2026, null, 'pending', false, false]);
  });

  it('insertRequest of a type without approval: approved at once, auto_approved, decided_at = NOW(), no decided_by', async () => {
    const { db, calls } = spyDb({ insertId: 34 });
    await q.insertRequest(db, {
      userId: 7, leaveTypeId: 7, dateFrom: '2026-11-13', dateTo: '2026-11-19', dayCount: 'calendar', workingDays: 7, daysFromCarried: 0, daysFromAnnual: 0,
      poolYear: 2026, comment: null, autoApproved: true,
    });
    expect(calls[0]![0]).toMatch(/IF\(\?, NOW\(\), NULL\)/);
    expect(calls[0]![0]).not.toContain('decided_by');
    expect(calls[0]![1]).toEqual([7, 7, '2026-11-13', '2026-11-19', 'calendar', 7, 0, 0, 2026, null, 'approved', true, true]);
  });

  it('setWithdrawn changes the request of this user only while it still has the checked status; returns affected rows', async () => {
    const { db, calls } = spyDb({ affectedRows: 0 });
    expect(await q.setWithdrawn(db, 21, 7, 'pending')).toBe(0);
    expect(calls[0]![0]).toMatch(/WHERE id = \? AND user_id = \? AND status = \?/);
    expect(calls[0]![1]).toEqual(['withdrawn', 21, 7, 'pending']);
    await q.setWithdrawn(db, 22, 7, 'approved');
    expect(calls[1]![1]).toEqual(['withdrawn', 22, 7, 'approved']);
  });

  it('sumPoolUsage with lock reads the latest state (FOR SHARE), e.g. in „Zamknij rok” after a decision', async () => {
    const { db, calls } = spyDb([]);
    await q.sumPoolUsage(db, [7], 2026, { lock: true });
    expect(calls[0]![0]).toMatch(/FOR SHARE$/);
    await q.sumPoolUsage(db, [7], 2026);
    expect(calls[1]![0]).not.toMatch(/FOR SHARE/);
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

describe('requests per person (Archiwum)', () => {
  it('countRequestsByUser counts requests in every status per person', async () => {
    const { db, calls } = spyDb([{ user_id: 7, total: 3 }]);
    expect(await q.countRequestsByUser(db, [7, 8])).toEqual(new Map([[7, 3]]));
    expect(calls[0]![0]).toMatch(/WHERE user_id IN \(\?\) GROUP BY user_id/);
    expect(calls[0]![1]).toEqual([[7, 8]]);
  });

  it('countRequestsByUser without people does not ask the database', async () => {
    const { db, calls } = spyDb([]);
    expect(await q.countRequestsByUser(db, [])).toEqual(new Map());
    expect(calls).toHaveLength(0);
  });
});
