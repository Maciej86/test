import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { listEmployees } = await import('./employees.queries');

function fakeDb(rows: unknown[][]) {
  const query = vi.fn();
  for (const r of rows) query.mockResolvedValueOnce([r]);
  return { query };
}

describe('employees queries', () => {
  it('searches by name and login with parameters and filters by role', async () => {
    const db = fakeDb([[], [{ total: 0 }]]);
    await listEmployees(db, { search: 'kowal', role: 'employee', sort: 'name', dir: 'asc', page: 2, pageSize: 25, year: 2026 });
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('u.name LIKE ? OR u.login LIKE ?');
    expect(sql).not.toContain('kowal');
    expect(params).toEqual([2026, '%kowal%', '%kowal%', 'employee', 25, 25]);
  });

  it('sorts by surname, and by days left with administrators last', async () => {
    const db = fakeDb([[], [{ total: 0 }], [], [{ total: 0 }]]);
    await listEmployees(db, { search: '', sort: 'name', dir: 'desc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[0]![0]).toContain("ORDER BY SUBSTRING_INDEX(u.name, ' ', -1) DESC, u.name DESC");
    await listEmployees(db, { search: '', sort: 'days_left', dir: 'asc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[2]![0]).toContain("ORDER BY u.role = 'admin', p.annual_days + p.carried_days ASC, u.name ASC");
  });

  it('escapes % and _ typed in search', async () => {
    const db = fakeDb([[], [{ total: 0 }]]);
    await listEmployees(db, { search: '50%_', sort: 'name', dir: 'asc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[0]![1]).toContain('%50\\%\\_%');
  });
});
