import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db/pool';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../leave-requests.queries');

const spyDb = (rows: unknown[]) => {
  const calls: [string, unknown[] | undefined][] = [];
  const db = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [rows]; }) };
  return { db: db as unknown as Db, calls };
};

describe('leave requests queries for the calendar', () => {
  it('listCalendarAbsences: pending and approved of the given people overlapping the range, with type name and color', async () => {
    const row = { id: 21, user_id: 2, leave_type_name: 'Wypoczynkowy', color: 'green', status: 'pending', date_from: '2026-11-26', date_to: '2026-11-27', working_days: 2 };
    const { db, calls } = spyDb([row]);
    expect(await q.listCalendarAbsences(db, [2, 3], '2026-11-17', '2027-01-16')).toEqual([
      { id: 21, userId: 2, leaveTypeName: 'Wypoczynkowy', color: 'green', status: 'pending', dateFrom: '2026-11-26', dateTo: '2026-11-27', days: 2 },
    ]);
    const [sql, params] = calls[0]!;
    expect(sql).toMatch(/r\.status IN \(\?\)/);
    expect(sql).toMatch(/r\.user_id IN \(\?\)/);
    expect(sql).toMatch(/r\.date_from <= \? AND r\.date_to >= \?/);
    expect(sql).toMatch(/JOIN leave_types/);
    expect(params).toEqual([['pending', 'approved'], [2, 3], '2027-01-16', '2026-11-17']);
  });

  it('listCalendarAbsences: no people → no query, empty list', async () => {
    const { db, calls } = spyDb([]);
    expect(await q.listCalendarAbsences(db, [], '2026-11-17', '2027-01-16')).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
