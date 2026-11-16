import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { listAdminEmails } = await import('../recipients');

describe('listAdminEmails', () => {
  it('selects only active admins with an email, with no user input in the SQL', async () => {
    const db = { query: vi.fn().mockResolvedValue([[{ name: 'Anna Nowak', email: 'anna.nowak@firma.pl' }]]) };
    const result = await listAdminEmails(db);
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain("role = 'admin'");
    expect(sql).toContain('archived_at IS NULL');
    expect(sql).toContain('email IS NOT NULL');
    expect(params ?? []).toEqual([]);
    expect(result).toEqual([{ name: 'Anna Nowak', email: 'anna.nowak@firma.pl' }]);
  });
});
