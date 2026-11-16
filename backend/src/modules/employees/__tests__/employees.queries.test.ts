import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { insertUser, listEmployees, setTemporaryPassword } = await import('../employees.queries');

function fakeDb(rows: unknown[][]) {
  const query = vi.fn();
  for (const r of rows) query.mockResolvedValueOnce([r]);
  return { query };
}

describe('employees queries', () => {
  it('a temporary password raises token_version, so the person is logged out everywhere', async () => {
    const db = { query: vi.fn().mockResolvedValue([{}]) };
    await setTemporaryPassword(db, 2, 'h');
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('token_version = token_version + 1');
    expect(params).toEqual(['h', 2]);
  });

  it('inserts first and last name, never the generated name column', async () => {
    const db = { query: vi.fn().mockResolvedValue([{ insertId: 5 }]) };
    await insertUser(db, { firstName: 'Jan', lastName: 'Kowalski', login: 'jan@firma.pl', email: null, role: 'employee', passwordHash: 'h' });
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO users (first_name, last_name, login, email, role, password_hash, must_change_password)');
    expect(params).toEqual(['Jan', 'Kowalski', 'jan@firma.pl', null, 'employee', 'h']);
  });

  it('searches by name and login with parameters and filters by role', async () => {
    const db = fakeDb([[], [{ total: 0 }]]);
    await listEmployees(db, { search: 'kowal', role: 'employee', sort: 'name', dir: 'asc', page: 2, pageSize: 25, year: 2026 });
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain('u.first_name LIKE ? OR u.last_name LIKE ? OR u.name LIKE ? OR u.login LIKE ?');
    expect(sql).not.toContain('kowal');
    expect(params).toEqual([2026, '%kowal%', '%kowal%', '%kowal%', '%kowal%', 'employee', 25, 25]);
  });

  it('sorts by last name, and by days left with administrators last', async () => {
    const db = fakeDb([[], [{ total: 0 }], [], [{ total: 0 }]]);
    await listEmployees(db, { search: '', sort: 'name', dir: 'desc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[0]![0]).toContain('ORDER BY u.last_name DESC, u.first_name DESC');
    await listEmployees(db, { search: '', sort: 'days_left', dir: 'asc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[2]![0]).toContain("ORDER BY u.role = 'admin', p.annual_days + p.carried_days ASC, u.last_name ASC, u.first_name ASC");
  });

  it('escapes % and _ typed in search', async () => {
    const db = fakeDb([[], [{ total: 0 }]]);
    await listEmployees(db, { search: '50%_', sort: 'name', dir: 'asc', page: 1, pageSize: 25, year: 2026 });
    expect(db.query.mock.calls[0]![1]).toContain('%50\\%\\_%');
  });
});
