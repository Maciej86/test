import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('./employees.queries', () => ({ minOpenYear: vi.fn(), findUser: vi.fn(), findPool: vi.fn(), listActiveUsers: vi.fn() }));

const q = await import('./employees.queries');
const { getOpenYear, getPoolUsage, toPool } = await import('./employees.service');
const { todayIsoDate } = await import('@app/shared');

describe('employees service', () => {
  it('toPool: 26 + 4 carried, 9 used → 21 left, 0 carried left', () => {
    expect(toPool(2026, 26, 4, { usedDays: 9, pendingDays: 2 })).toEqual({
      year: 2026, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 2, leftDays: 21, leftCarriedDays: 0,
    });
  });

  it('toPool: nothing used → 4 carried left', () => {
    expect(toPool(2026, 26, 4, { usedDays: 0, pendingDays: 0 })).toMatchObject({ leftDays: 30, leftCarriedDays: 4 });
  });

  it('toPool: more used than the pool (pool lowered later) → 0 left, never negative', () => {
    expect(toPool(2026, 10, 0, { usedDays: 12, pendingDays: 0 })).toMatchObject({ leftDays: 0, leftCarriedDays: 0 });
  });

  it('getOpenYear: no pools → current year in Europe/Warsaw', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(null);
    expect(await getOpenYear()).toBe(Number(todayIsoDate().slice(0, 4)));
  });

  it('getOpenYear: 2026 closed, 2027 open → 2027', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(2027);
    expect(await getOpenYear()).toBe(2027);
  });

  it('getPoolUsage returns zeros until my-leave replaces it', async () => {
    expect([...(await getPoolUsage([2, 3], 2026)).entries()]).toEqual([
      [2, { usedDays: 0, pendingDays: 0 }],
      [3, { usedDays: 0, pendingDays: 0 }],
    ]);
  });

  it.todo('listActiveUsers skips archived accounts');
  it.todo('getPool for an admin → null');
});
