import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../leave-types.queries');

const db = (rows: unknown = []) => ({ query: vi.fn().mockResolvedValue([rows]) });
const row = (o: Record<string, unknown>) => ({ id: 1, name: 'Wypoczynkowy', deducts_pool: 1, yearly_limit: null, color: 'green', day_count: 'working', requires_approval: 1, position: 1, hidden_at: null, ...o });

describe('leave types queries', () => {
  it('findLeaveType with lock adds FOR UPDATE (rename: true „before” in the history)', async () => {
    const calls: string[] = [];
    const spy = { query: vi.fn(async (sql: string) => { calls.push(sql); return [[]]; }) } as unknown as Parameters<typeof q.findLeaveType>[0];
    await q.findLeaveType(spy, 3, { lock: true });
    await q.findLeaveType(spy, 3);
    expect(calls[0]).toMatch(/WHERE id = \? FOR UPDATE$/);
    expect(calls[1]).not.toContain('FOR UPDATE');
  });

  it('every query uses ? parameters', async () => {
    const calls: [string, unknown[] | undefined][] = [];
    const spy = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [[{ id: 3, insertId: 3, max: 2 }]]; }) } as unknown as Parameters<typeof q.findLeaveType>[0];
    await q.findLeaveType(spy, 3);
    await q.findByName(spy, 'Na żądanie', 3);
    await q.insertLeaveType(spy, { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: 5, color: 'teal', dayCount: 'calendar', requiresApproval: false }, 6);
    await q.updateLeaveType(spy, 3, { name: 'Szkoleniowy', deductsPool: false, yearlyLimit: null, color: 'grape', dayCount: 'working', requiresApproval: true });
    await q.setPosition(spy, 3, 2);
    await q.setHidden(spy, 3);
    await q.setVisible(spy, 3, 7);
    await q.findSelectableLeaveType(3, spy);
    for (const [sql, params] of calls) {
      expect(sql).not.toMatch(/Szkoleniowy|żądanie/);
      expect(params?.length).toBeGreaterThan(0);
    }
    expect(calls[1]![1]).toEqual(['Na żądanie', 3, 3]);
    expect(calls[2]![1]).toEqual(['Szkoleniowy', true, 5, 'teal', 'calendar', false, 6]);
    expect(calls[3]![1]).toEqual(['Szkoleniowy', false, null, 'grape', 'working', true, 3]);
    expect(calls[6]![1]).toEqual([7, 3]);
  });

  it('findByName without exceptId does not skip any type', async () => {
    const spy = db([]);
    await q.findByName(spy, 'Na żądanie', null);
    expect(spy.query.mock.calls[0]![1]).toEqual(['Na żądanie', null, null]);
  });

  it('listLeaveTypes: visible by position, then hidden by name, mapped to LeaveTypeItem with requestsCount 0', async () => {
    const spy = db([row({}), row({ id: 5, name: 'Bezpłatny', deducts_pool: 0, yearly_limit: 4, color: 'orange', day_count: 'calendar', requires_approval: 0, hidden_at: new Date() })]);
    const items = await q.listLeaveTypes(spy);
    expect(spy.query.mock.calls[0]![0]).toMatch(/ORDER BY hidden_at IS NOT NULL, CASE WHEN hidden_at IS NULL THEN position END, name/);
    expect(items).toEqual([
      { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, dayCount: 'working', requiresApproval: true, color: 'green', hidden: false, requestsCount: 0 },
      { id: 5, name: 'Bezpłatny', deductsPool: false, yearlyLimit: 4, dayCount: 'calendar', requiresApproval: false, color: 'orange', hidden: true, requestsCount: 0 },
    ]);
  });

  it('findSelectableLeaveType: hidden type → null', async () => {
    const spy = db([]);
    expect(await q.findSelectableLeaveType(5, spy)).toBeNull();
    expect(spy.query.mock.calls[0]![0]).toContain('hidden_at IS NULL');
    const found = db([row({ id: 2, name: 'Na żądanie', yearly_limit: 4 })]);
    expect(await q.findSelectableLeaveType(2, found)).toEqual({ id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, dayCount: 'working', requiresApproval: true });
  });

  it('listSelectableLeaveTypes: only visible, by position', async () => {
    const spy = db([row({})]);
    expect(await q.listSelectableLeaveTypes(spy)).toEqual([{ id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, dayCount: 'working', requiresApproval: true }]);
    expect(spy.query.mock.calls[0]![0]).toMatch(/WHERE hidden_at IS NULL ORDER BY position/);
  });

  it('lockVisible locks visible rows FOR UPDATE ordered by position', async () => {
    const spy = db([{ id: 1, position: 1 }]);
    expect(await q.lockVisible(spy)).toEqual([{ id: 1, position: 1 }]);
    expect(spy.query.mock.calls[0]![0]).toMatch(/WHERE hidden_at IS NULL ORDER BY position FOR UPDATE/);
  });

  it('maxPosition: empty table → 0', async () => {
    expect(await q.maxPosition(db([{ max: null }]))).toBe(0);
    expect(await q.maxPosition(db([{ max: 5 }]))).toBe(5);
  });
});
