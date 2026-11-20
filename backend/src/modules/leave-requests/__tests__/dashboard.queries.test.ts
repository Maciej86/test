import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../leave-requests.queries');

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

describe('leave requests queries for the dashboard', () => {
  it('listPendingForDashboard: only pending, any year, ORDER BY date_from, created_at, id, LIMIT ?, total of all pending', async () => {
    const row = {
      id: 21, employee_name: 'Jan Kowalski', leave_type_name: 'Wypoczynkowy', date_from: '2026-11-26', date_to: '2026-11-27',
      working_days: 2, created_at: new Date('2026-11-16T08:12:00.000Z'),
    };
    const { db, calls } = spyDb([row], [{ total: 3 }]);
    const result = await q.listPendingForDashboard(db, 5);
    expect(result).toEqual({
      items: [{ id: 21, employeeName: 'Jan Kowalski', leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2, createdAt: '2026-11-16T08:12:00.000Z' }],
      total: 3,
    });
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.status = \?/);
    expect(sql).not.toMatch(/pool_year/);
    expect(sql).toMatch(/ORDER BY r\.date_from ASC, r\.created_at ASC, r\.id ASC LIMIT \?/);
    expect(params).toEqual(['pending', 5]);
    expect(calls[1]![0]).toMatch(/COUNT\(\*\)[\s\S]*status = \?/);
    expect(calls[1]![1]).toEqual(['pending']);
  });

  it('listAbsences: approved and pending overlapping from–to, without archived accounts, ORDER BY date_from, surname; no type or comment', async () => {
    const { db, calls } = spyDb([{ user_id: 4, name: 'Magdalena Lewandowska', date_from: '2026-11-18', date_to: '2026-11-27', status: 'approved' }]);
    expect(await q.listAbsences(db, '2026-11-20', '2026-12-03')).toEqual([
      { userId: 4, name: 'Magdalena Lewandowska', dateFrom: '2026-11-18', dateTo: '2026-11-27', status: 'approved' },
    ]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.status IN \(\?\)/);
    expect(sql).toMatch(/r\.date_from <= \? AND r\.date_to >= \?/);
    expect(sql).toMatch(/u\.archived_at IS NULL/);
    expect(sql).toMatch(/ORDER BY r\.date_from, u\.last_name, u\.first_name, u\.id/);
    expect(sql).not.toMatch(/leave_type|comment|reason/);
    expect(params).toEqual([['pending', 'approved'], '2026-12-03', '2026-11-20']);
  });
});
