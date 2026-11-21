import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../leave-requests.queries');
type ListFilters = import('../leave-requests.queries').ListFilters;

type Call = [string, unknown[] | undefined];
const spyDb = (...results: unknown[]) => {
  const calls: Call[] = [];
  let i = 0;
  const db = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push([sql, params]);
      const result = results[Math.min(i, results.length - 1)] ?? [];
      i += 1;
      return [result];
    }),
  };
  return { db: db as unknown as Db, calls };
};

const filters = (o: Partial<ListFilters> = {}): ListFilters => ({ status: 'pending', year: 2026, leaveTypeId: undefined, search: '', page: 1, ...o });

describe('leave requests queries', () => {
  it('listRequests filters by status, pool_year (not for pending), leave type and employee name, with ? parameters', async () => {
    const { db, calls } = spyDb([], [{ total: 0 }]);
    await q.listRequests(db, filters({ status: 'approved', leaveTypeId: 3, search: 'Kow' }));
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.status = \?/);
    expect(sql).toMatch(/r\.pool_year = \?/);
    expect(sql).toMatch(/r\.leave_type_id = \?/);
    expect(sql).toMatch(/u\.name LIKE \?/);
    expect(sql).not.toMatch(/'approved'|Kow/);
    expect(params).toEqual(['approved', 2026, 3, '%Kow%', 25, 0]);
    expect(calls[1]![1]).toEqual(['approved', 2026, 3, '%Kow%']);

    const pending = spyDb([], [{ total: 0 }]);
    await q.listRequests(pending.db, filters());
    expect(pending.calls[0]![0]).not.toMatch(/pool_year = \?/);
    expect(pending.calls[0]![1]).toEqual(['pending', 25, 0]);

    const all = spyDb([], [{ total: 0 }]);
    await q.listRequests(all.db, filters({ status: 'all' }));
    expect(all.calls[0]![0]).not.toMatch(/r\.status = \?/);
    expect(all.calls[0]![1]).toEqual([2026, 25, 0]);
  });

  it('listRequests: % and _ in the search are searched literally, not as wildcards', async () => {
    const { db, calls } = spyDb([], [{ total: 0 }]);
    await q.listRequests(db, filters({ search: '_%' }));
    expect(calls[0]![1]).toContain('%\\_\\%%');
  });

  it('listRequests orders pending by created_at ASC and others by date_from DESC; page 2 uses OFFSET', async () => {
    const pending = spyDb([], [{ total: 0 }]);
    await q.listRequests(pending.db, filters());
    expect(pending.calls[0]![0]).toMatch(/ORDER BY r\.created_at ASC, r\.id ASC/);
    const approved = spyDb([], [{ total: 30 }]);
    const result = await q.listRequests(approved.db, filters({ status: 'approved', page: 2 }));
    expect(approved.calls[0]![0]).toMatch(/ORDER BY r\.date_from DESC, r\.id DESC/);
    expect(approved.calls[0]![1]!.slice(-2)).toEqual([25, 25]);
    expect(result.total).toBe(30);
  });

  it('listRequests maps rows: employee name, archive flag, numbers', async () => {
    const row = {
      id: 21, user_id: 7, employee_name: 'Jan Kowalski', employee_archived_at: null, leave_type_id: 1, leave_type_name: 'Wypoczynkowy',
      deducts_pool: 1, date_from: '2026-11-26', date_to: '2026-11-27', working_days: 2, days_from_carried: 0, days_from_annual: 2,
      pool_year: 2026, comment: null, status: 'pending', decision_reason: null, decided_by_name: null, decided_at: null,
      created_at: new Date('2026-11-16T08:12:00Z'), day_count: 'calendar', auto_approved: 1,
    };
    const { db } = spyDb([row, { ...row, id: 4, employee_archived_at: new Date() }], [{ total: 2 }]);
    const { rows } = await q.listRequests(db, filters());
    expect(rows[0]).toMatchObject({ id: 21, userId: 7, employeeName: 'Jan Kowalski', employeeArchived: false, deductsPool: true, createdAt: '2026-11-16T08:12:00.000Z', dayCount: 'calendar', autoApproved: true });
    expect(rows[1]!.employeeArchived).toBe(true);
  });

  it('pendingSummary returns count and the oldest created_at; listRequestYears returns distinct pool years', async () => {
    const summary = spyDb([{ total: 3, oldest: new Date('2026-11-13T05:48:00Z') }]);
    expect(await q.pendingSummary(summary.db)).toEqual({ count: 3, oldestAt: '2026-11-13T05:48:00.000Z' });
    expect(summary.calls[0]![1]).toEqual(['pending']);
    expect(await q.pendingSummary(spyDb([{ total: 0, oldest: null }]).db)).toEqual({ count: 0, oldestAt: null });
    const years = spyDb([{ pool_year: 2026 }, { pool_year: 2025 }]);
    expect(await q.listRequestYears(years.db)).toEqual([2026, 2025]);
    expect(years.calls[0]![0]).toMatch(/SELECT DISTINCT pool_year/);
  });

  it('findRequest locks the row FOR UPDATE only with lock', async () => {
    const locked = spyDb([]);
    expect(await q.findRequest(locked.db, 21, { lock: true })).toBeNull();
    // Tylko wiersz wniosku: blokada konta pracownika i typu urlopu czekałaby na „Zamknij rok” (zakleszczenie).
    expect(locked.calls[0]![0]).toMatch(/FOR UPDATE OF r$/);
    expect(locked.calls[0]![1]).toEqual([21]);
    const plain = spyDb([]);
    await q.findRequest(plain.db, 21);
    expect(plain.calls[0]![0]).not.toMatch(/FOR UPDATE/);
  });

  it('listOverlapping: other people, pending and approved, a shared edge day counts', async () => {
    const { db, calls } = spyDb([{ employee_name: 'Tomasz Wójcik', date_from: '2026-12-21', date_to: '2026-12-22', status: 'approved' }]);
    const others = await q.listOverlapping(db, { userId: 4, dateFrom: '2026-12-21', dateTo: '2026-12-24' });
    expect(others).toEqual([{ employeeName: 'Tomasz Wójcik', dateFrom: '2026-12-21', dateTo: '2026-12-22', status: 'approved' }]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.user_id <> \?/);
    expect(sql).toMatch(/r\.date_from <= \? AND r\.date_to >= \?/);
    expect(params).toEqual([4, ['pending', 'approved'], '2026-12-24', '2026-12-21']);
  });

  it('findOpenPools returns the open pool of each person; isPoolOpen checks closed_at of the year', async () => {
    const pools = spyDb([{ id: 1, user_id: 7, year: 2026, annual_days: 26, carried_days: 4, closed_at: null }]);
    const map = await q.findOpenPools(pools.db, [7, 8]);
    expect(map.get(7)).toMatchObject({ year: 2026, annual_days: 26 });
    expect(map.has(8)).toBe(false);
    expect(pools.calls[0]![0]).toMatch(/closed_at IS NULL/);
    expect(pools.calls[0]![1]).toEqual([[7, 8]]);
    expect(await q.findOpenPools(spyDb([]).db, [])).toEqual(new Map());

    const open = spyDb([{ open: 1 }]);
    expect(await q.isPoolOpen(open.db, 7, 2026)).toBe(true);
    expect(open.calls[0]![1]).toEqual([7, 2026]);
    expect(await q.isPoolOpen(spyDb([]).db, 7, 2026)).toBe(false);
  });

  it('setDecision updates only when the status still matches and saves who, when and the reason', async () => {
    const { db, calls } = spyDb({ affectedRows: 1 });
    expect(await q.setDecision(db, 21, { from: 'approved', to: 'cancelled', actor: { id: 1, name: 'Anna Nowak' }, reason: 'Przesunięty.' })).toBe(1);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/UPDATE leave_requests SET status = \?, decided_by = \?, decided_by_name = \?, decided_at = NOW\(\), decision_reason = \?/);
    expect(sql).toMatch(/WHERE id = \? AND status = \?$/);
    expect(params).toEqual(['cancelled', 1, 'Anna Nowak', 'Przesunięty.', 21, 'approved']);
    expect(await q.setDecision(spyDb({ affectedRows: 0 }).db, 21, { from: 'pending', to: 'approved', actor: { id: 1, name: 'Anna' }, reason: null })).toBe(0);
  });

  // Zadania pokazują przy przypisanej osobie tylko daty zatwierdzonego urlopu (bez rodzaju i powodu).
  it('listApprovedLeaves returns only dates of approved leaves overlapping the range', async () => {
    const { db, calls } = spyDb([{ user_id: 5, date_from: '2026-11-23', date_to: '2026-11-27' }]);
    expect(await q.listApprovedLeaves(db, [5, 6], '2026-11-18', '2026-12-02')).toEqual([{ userId: 5, dateFrom: '2026-11-23', dateTo: '2026-11-27' }]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/status = \?/);
    expect(sql).toMatch(/date_from <= \? AND date_to >= \?/);
    expect(sql).not.toMatch(/leave_type|reason|comment/);
    expect(params).toEqual([[5, 6], 'approved', '2026-12-02', '2026-11-18']);
  });

  it('listApprovedLeaves with no people asks nothing', async () => {
    const { db, calls } = spyDb([]);
    expect(await q.listApprovedLeaves(db, [], '2026-11-18', '2026-12-02')).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
