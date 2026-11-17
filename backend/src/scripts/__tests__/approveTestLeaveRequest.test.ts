import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { approveNewestPending } = await import('../approveTestLeaveRequest');

type Call = [string, unknown[]];
/** Połączenie, które odpowiada kolejnymi wynikami i zapisuje zapytania. */
const fakeConn = (...results: unknown[]) => {
  const calls: Call[] = [];
  const conn = { query: vi.fn(async (sql: string, params: unknown[]) => { calls.push([sql, params]); return [results.shift() ?? []]; }) };
  return { conn: conn as never, calls };
};

beforeEach(() => vi.clearAllMocks());

describe('approveNewestPending', () => {
  it('approves the newest pending request as the first active admin', async () => {
    const { conn, calls } = fakeConn([{ id: 1, name: 'Anna Nowak' }], [{ id: 21, employee: 'Jan Kowalski' }], { affectedRows: 1 });
    expect(await approveNewestPending(conn, {})).toEqual({ id: 21, employee: 'Jan Kowalski', admin: 'Anna Nowak' });
    expect(calls[0]![0]).toMatch(/role = \? AND archived_at IS NULL ORDER BY id LIMIT 1/);
    expect(calls[0]![1]).toEqual(['admin']);
    expect(calls[1]![0]).toMatch(/status = \? ORDER BY r\.created_at DESC, r\.id DESC LIMIT 1/);
    expect(calls[1]![1]).toEqual(['pending']);
    expect(calls[2]![0]).toMatch(/UPDATE leave_requests SET status = \?, decided_by = \?, decided_by_name = \?, decided_at = NOW\(\) WHERE id = \? AND status = \?/);
    expect(calls[2]![1]).toEqual(['approved', 1, 'Anna Nowak', 21, 'pending']);
  });

  it('with a login approves only that person\'s newest pending request', async () => {
    const { conn, calls } = fakeConn([{ id: 1, name: 'Anna Nowak' }], [{ id: 22, employee: 'Ewa Lis' }], { affectedRows: 1 });
    expect(await approveNewestPending(conn, {}, 'Ewa.Lis@firma.pl')).toMatchObject({ id: 22 });
    expect(calls[1]![0]).toMatch(/u\.login = \?/);
    expect(calls[1]![1]).toEqual(['pending', 'ewa.lis@firma.pl']);
  });

  it('returns null when nothing is pending', async () => {
    const { conn, calls } = fakeConn([{ id: 1, name: 'Anna Nowak' }], []);
    expect(await approveNewestPending(conn, {})).toBeNull();
    expect(calls).toHaveLength(2);
  });

  it('without an active admin → error', async () => {
    const { conn } = fakeConn([]);
    await expect(approveNewestPending(conn, {})).rejects.toThrow(/administrator/);
  });

  it('refuses in production without any query', async () => {
    const { conn, calls } = fakeConn();
    await expect(approveNewestPending(conn, { NODE_ENV: 'production' })).rejects.toThrow(/produkcyjnym/);
    expect(calls).toHaveLength(0);
  });
});
