import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../contract-types.queries');

const db = (rows: unknown = []) => ({ query: vi.fn().mockResolvedValue([rows]) });
const row = (o: Record<string, unknown>) => ({ id: 1, name: 'Umowa o pracę', position: 1, hidden_at: null, employees_count: 0, ...o });

describe('contract types queries', () => {
  it('every query uses ? parameters', async () => {
    const calls: [string, unknown[] | undefined][] = [];
    const spy = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [[{ id: 3, insertId: 3, max: 2 }]]; }) } as unknown as Parameters<typeof q.findContractType>[0];
    await q.findContractType(spy, 3);
    await q.findByName(spy, 'Umowa zlecenie', 3);
    await q.insertContractType(spy, { name: 'Umowa o staż' }, 6);
    await q.updateContractType(spy, 3, { name: 'Umowa o staż' });
    await q.setPosition(spy, 3, 2);
    await q.setHidden(spy, 3);
    await q.setVisible(spy, 3, 7);
    for (const [sql, params] of calls) {
      expect(sql).not.toMatch(/Umowa/);
      expect(params?.length).toBeGreaterThan(0);
    }
    expect(calls[1]![1]).toEqual(['Umowa zlecenie', 3, 3]);
    expect(calls[2]![1]).toEqual(['Umowa o staż', 6]);
    expect(calls[3]![1]).toEqual(['Umowa o staż', 3]);
    expect(calls[6]![1]).toEqual([7, 3]);
  });

  it('findByName without exceptId does not skip any type', async () => {
    const spy = db([]);
    await q.findByName(spy, 'B2B', null);
    expect(spy.query.mock.calls[0]![1]).toEqual(['B2B', null, null]);
  });

  it('listContractTypes: visible by position, then hidden by name, with employeesCount', async () => {
    const spy = db([row({ employees_count: 4 }), row({ id: 5, name: 'Umowa o staż', hidden_at: new Date(), employees_count: '0' })]);
    const items = await q.listContractTypes(spy);
    const sql = spy.query.mock.calls[0]![0] as string;
    expect(sql).toMatch(/LEFT JOIN users/);
    expect(sql).toMatch(/GROUP BY/);
    expect(sql).toMatch(/ORDER BY c\.hidden_at IS NOT NULL, CASE WHEN c\.hidden_at IS NULL THEN c\.position END, c\.name/);
    expect(items).toEqual([
      { id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 },
      { id: 5, name: 'Umowa o staż', hidden: true, employeesCount: 0 },
    ]);
  });

  it('findContractType with forShare locks the row against a parallel hide', async () => {
    const spy = db([]);
    await q.findContractType(spy, 4, { forShare: true });
    expect(spy.query.mock.calls[0]![0]).toMatch(/WHERE id = \? FOR SHARE$/);
    const plain = db([]);
    await q.findContractType(plain, 4);
    expect(plain.query.mock.calls[0]![0]).not.toMatch(/FOR SHARE/);
  });

  it('findContractType returns id, name and hidden; missing → null', async () => {
    expect(await q.findContractType(db([row({ id: 4, name: 'B2B', hidden_at: new Date() })]), 4)).toEqual({ id: 4, name: 'B2B', hidden: true });
    expect(await q.findContractType(db([]), 9)).toBeNull();
  });

  it('listSelectableContractTypes: only visible, by position', async () => {
    const spy = db([row({})]);
    expect(await q.listSelectableContractTypes(spy)).toEqual([{ id: 1, name: 'Umowa o pracę' }]);
    expect(spy.query.mock.calls[0]![0]).toMatch(/WHERE hidden_at IS NULL ORDER BY position/);
  });

  it('lockVisible and maxPosition lock rows FOR UPDATE', async () => {
    const spy = db([{ id: 1, position: 1 }]);
    expect(await q.lockVisible(spy)).toEqual([{ id: 1, position: 1 }]);
    expect(spy.query.mock.calls[0]![0]).toMatch(/WHERE hidden_at IS NULL ORDER BY position FOR UPDATE/);
    const max = db([{ max: null }]);
    expect(await q.maxPosition(max)).toBe(0);
    expect(max.query.mock.calls[0]![0]).toMatch(/FOR UPDATE/);
    expect(await q.maxPosition(db([{ max: 5 }]))).toBe(5);
  });
});
