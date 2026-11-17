import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../employees.queries', () => ({ minOpenYear: vi.fn(), findUser: vi.fn(), findPool: vi.fn(), listActiveUsers: vi.fn() }));
vi.mock('../../my-leave/my-leave.queries', () => ({ sumPoolUsage: vi.fn() }));

const q = await import('../employees.queries');
const myLeave = await import('../../my-leave/my-leave.queries');
const { pool } = await import('../../../db/pool');
const { getOpenYear, getPool, getPoolUsage, listActiveUsers, toPool } = await import('../employees.service');
const { todayIsoDate } = await import('@app/shared');

describe('employees service', () => {
  it('toPool: 26 + 4 carried, 9 used (4 from carried) → 21 left, 0 carried left', () => {
    expect(toPool(2026, 26, 4, { usedDays: 9, pendingDays: 2, usedCarried: 4 })).toEqual({
      year: 2026, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 2, leftDays: 21, leftCarriedDays: 0,
    });
  });

  it('toPool takes carried days left from the saved split (9 used, only 2 from carried → 2 carried left)', () => {
    expect(toPool(2026, 26, 4, { usedDays: 9, pendingDays: 0, usedCarried: 2 })).toMatchObject({ leftDays: 21, leftCarriedDays: 2 });
  });

  it('toPool: nothing used → 4 carried left', () => {
    expect(toPool(2026, 26, 4, { usedDays: 0, pendingDays: 0, usedCarried: 0 })).toMatchObject({ leftDays: 30, leftCarriedDays: 4 });
  });

  it('toPool: more used than the pool (pool lowered later) → 0 left, never negative', () => {
    expect(toPool(2026, 10, 0, { usedDays: 12, pendingDays: 0, usedCarried: 1 })).toMatchObject({ leftDays: 0, leftCarriedDays: 0 });
  });

  it('getOpenYear: no pools → current year in Europe/Warsaw', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(null);
    expect(await getOpenYear()).toBe(Number(todayIsoDate().slice(0, 4)));
  });

  it('getOpenYear: 2026 closed, 2027 open → 2027', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(2027);
    expect(await getOpenYear()).toBe(2027);
  });

  it('getPoolUsage counts approved (used) and pending days from leave requests', async () => {
    vi.mocked(myLeave.sumPoolUsage).mockResolvedValue(
      new Map([
        [2, { usedCarried: 4, usedAnnual: 5, pendingCarried: 0, pendingAnnual: 2 }],
        [3, { usedCarried: 0, usedAnnual: 0, pendingCarried: 0, pendingAnnual: 0 }],
      ]),
    );
    expect([...(await getPoolUsage([2, 3], 2026)).entries()]).toEqual([
      [2, { usedDays: 9, pendingDays: 2, usedCarried: 4 }],
      [3, { usedDays: 0, pendingDays: 0, usedCarried: 0 }],
    ]);
    expect(myLeave.sumPoolUsage).toHaveBeenCalledWith(pool, [2, 3], 2026, {});
  });

  it('listActiveUsers passes on the query that skips archived accounts', async () => {
    vi.mocked(q.listActiveUsers).mockResolvedValue([{ id: 2, name: 'Jan Kowalski' }]);
    expect(await listActiveUsers()).toEqual([{ id: 2, name: 'Jan Kowalski' }]);
  });

  it('getPool for an admin → null; for an employee → counted pool', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ id: 1, role: 'admin', archived_at: null } as never);
    expect(await getPool(1, 2026)).toBeNull();
    vi.mocked(q.findUser).mockResolvedValue({ id: 2, role: 'employee', archived_at: null } as never);
    vi.mocked(q.findPool).mockResolvedValue({ annual_days: 26, carried_days: 4 } as never);
    vi.mocked(myLeave.sumPoolUsage).mockResolvedValue(new Map());
    expect(await getPool(2, 2026)).toMatchObject({ year: 2026, leftDays: 30, leftCarriedDays: 4 });
    vi.mocked(q.findPool).mockResolvedValue(null);
    expect(await getPool(2, 2027)).toBeNull();
  });
});
