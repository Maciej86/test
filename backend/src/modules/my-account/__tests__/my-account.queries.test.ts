import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../my-account.queries');

const spy = (rows: unknown[] = []) => {
  const calls: [string, unknown[] | undefined][] = [];
  const db = { query: vi.fn(async (sql: string, params?: unknown[]) => { calls.push([sql, params]); return [rows]; }) };
  return { db: db as unknown as Parameters<typeof q.findMyAccount>[0], calls };
};

describe('my account queries', () => {
  it('findMyAccount reads only the active account by id, with the contract type name (also hidden)', async () => {
    const { db, calls } = spy([{ name: 'Jan Kowalski', login: 'jan@firma.pl', role: 'employee', email: null, hired_on: '2021-09-01', contract_type_name: 'B2B' }]);
    expect(await q.findMyAccount(db, 2)).toEqual({ name: 'Jan Kowalski', login: 'jan@firma.pl', role: 'employee', email: null, hiredOn: '2021-09-01', contractTypeName: 'B2B' });
    const [sql, params] = calls[0]!;
    expect(sql).toContain('LEFT JOIN contract_types');
    expect(sql).not.toContain('hidden_at IS NULL');
    expect(sql).toContain('archived_at IS NULL');
    expect(sql).not.toMatch(/password/);
    expect(params).toEqual([2]);
  });

  it('findMyAccount → null when there is no such account', async () => {
    expect(await q.findMyAccount(spy([]).db, 9)).toBeNull();
  });

  it('isEmailTaken looks at all other accounts, archived too', async () => {
    const { db, calls } = spy([{ id: 7 }]);
    expect(await q.isEmailTaken(db, 'ewa@firma.pl', 2)).toBe(true);
    expect(calls[0]![0]).not.toContain('archived_at');
    expect(calls[0]![1]).toEqual(['ewa@firma.pl', 2]);
    expect(await q.isEmailTaken(spy([]).db, 'ewa@firma.pl', 2)).toBe(false);
  });

  it('lockPasswordHash locks the row of this account', async () => {
    const { db, calls } = spy([{ password_hash: 'h' }]);
    expect(await q.lockPasswordHash(db, 2)).toBe('h');
    expect(calls[0]![0]).toContain('FOR UPDATE');
    expect(calls[0]![1]).toEqual([2]);
  });

  it('lockMyEmail and setMyEmail use ? parameters', async () => {
    const { db, calls } = spy([{ email: 'stary@firma.pl' }]);
    expect(await q.lockMyEmail(db, 2)).toBe('stary@firma.pl');
    await q.setMyEmail(db, 2, null);
    expect(calls[0]![0]).toContain('FOR UPDATE');
    expect(calls[0]![1]).toEqual([2]);
    expect(calls[1]![1]).toEqual([null, 2]);
  });
});
