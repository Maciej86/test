import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../my-leave.queries');

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

const row = (id: number, from: string, to: string) => ({ id, leave_type_name: 'Wypoczynkowy', date_from: from, date_to: to, working_days: 2 });

describe('my leave queries for the dashboard', () => {
  it('listUpcomingOwn: own pending requests by date_from', async () => {
    const { db, calls } = spyDb([row(21, '2026-11-26', '2026-11-27')], []);
    const result = await q.listUpcomingOwn(db, 7, '2026-11-20');
    expect(result.pending).toEqual([{ id: 21, leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2 }]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.user_id = \? AND r\.status = \?/);
    expect(sql).toMatch(/ORDER BY r\.date_from, r\.id/);
    expect(params).toEqual([7, 'pending']);
  });

  it('listUpcomingOwn: next approved with date_to >= today (ongoing too), earliest date_from; none → null', async () => {
    const { db, calls } = spyDb([], [row(19, '2026-11-18', '2026-11-23')]);
    expect((await q.listUpcomingOwn(db, 7, '2026-11-20')).nextApproved).toEqual({
      id: 19, leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-11-18', dateTo: '2026-11-23', workingDays: 2,
    });
    const [sql, params] = calls[1]!;
    expect(sql).toMatch(/r\.user_id = \? AND r\.status = \? AND r\.date_to >= \?/);
    expect(sql).toMatch(/ORDER BY r\.date_from, r\.id LIMIT 1/);
    expect(params).toEqual([7, 'approved', '2026-11-20']);

    const none = spyDb([], []);
    expect((await q.listUpcomingOwn(none.db, 7, '2026-11-20')).nextApproved).toBeNull();
  });
});
