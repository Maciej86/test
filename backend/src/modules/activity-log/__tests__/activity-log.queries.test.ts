import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../activity-log.queries');

/** Udawana baza: kolejne wywołania dostają kolejne wyniki. */
const db = (...results: unknown[]) => {
  const query = vi.fn();
  for (const r of results) query.mockResolvedValueOnce([r]);
  return { query };
};
type Spy = ReturnType<typeof db>;
const sqlOf = (spy: Spy, call = 0) => (spy.query.mock.calls[call]![0] as string).replace(/\s+/g, ' ');
const paramsOf = (spy: Spy, call = 0) => spy.query.mock.calls[call]![1] as unknown[];

const row = {
  id: 412, created_at: new Date('2026-11-19T13:08:00Z'), user_id: 1, user_name: 'Anna Nowak', action: 'status',
  entity_type: 'leave_requests', entity_id: 21, entity_name: 'Jan Kowalski',
  entity_context: '{"leaveType":"Wypoczynkowy","from":"2026-12-22","to":"2026-12-31","days":6}',
  changes: { status: { before: 'pending', after: 'approved' } },
};
const base = { page: 1, pageSize: 50, search: '' };

describe('activity-log queries', () => {
  it('listEntries: newest first, 50 per page, total count, mapped rows', async () => {
    const spy = db([row], [{ total: 412 }]);
    const result = await q.listEntries(spy, { ...base, page: 2 });
    expect(sqlOf(spy)).toMatch(/FROM activity_log a ORDER BY a\.created_at DESC, a\.id DESC LIMIT \? OFFSET \?$/);
    expect(paramsOf(spy)).toEqual([50, 50]);
    expect(sqlOf(spy, 1)).toBe('SELECT COUNT(*) AS total FROM activity_log a');
    expect(result.total).toBe(412);
    expect(result.rows[0]).toEqual({
      id: 412, createdAt: '2026-11-19T13:08:00.000Z', userName: 'Anna Nowak', action: 'status', area: 'leave_requests',
      entityId: 21, entityName: 'Jan Kowalski', entityContext: { leaveType: 'Wypoczynkowy', from: '2026-12-22', to: '2026-12-31', days: 6 },
      changes: { status: { before: 'pending', after: 'approved' } },
    });
  });

  it('listEntries: JSON given as text and broken context are read safely', async () => {
    const spy = db([{ ...row, entity_context: 'nie json', changes: '{"a":{"before":1,"after":2}}' }], [{ total: 1 }]);
    const [item] = (await q.listEntries(spy, base)).rows;
    expect(item!.entityContext).toBeNull();
    expect(item!.changes).toEqual({ a: { before: 1, after: 2 } });
  });

  it('listEntries: search by entity name, context and author through LIKE ?, escaped', async () => {
    const spy = db([], [{ total: 0 }]);
    await q.listEntries(spy, { ...base, search: "50%_'; DROP" });
    expect(sqlOf(spy)).toContain('WHERE (a.entity_name LIKE ? OR a.entity_context LIKE ? OR a.user_name LIKE ?)');
    expect(sqlOf(spy)).not.toContain('DROP');
    expect(paramsOf(spy).slice(0, 3)).toEqual(Array(3).fill("%50\\%\\_'; DROP%"));
    expect(paramsOf(spy, 1)).toEqual(Array(3).fill("%50\\%\\_'; DROP%"));
  });

  it('listEntries: area, author and date range filters as parameters', async () => {
    const spy = db([], [{ total: 0 }]);
    const fromAt = new Date('2026-10-31T23:00:00Z');
    const toAt = new Date('2026-11-20T23:00:00Z');
    await q.listEntries(spy, { ...base, area: 'tasks', userId: 7, fromAt, toAt });
    expect(sqlOf(spy)).toContain('WHERE a.entity_type = ? AND a.user_id = ? AND a.created_at >= ? AND a.created_at < ?');
    expect(paramsOf(spy)).toEqual(['tasks', 7, fromAt, toAt, 50, 0]);
  });

  it('listPeople: authors with an account, current name, sorted by name', async () => {
    const spy = db([{ user_id: 3, user_name: 'Ewa Mazur' }, { user_id: 1, user_name: 'Anna Nowak' }]);
    expect(await q.listPeople(spy)).toEqual([{ userId: 3, userName: 'Ewa Mazur' }, { userId: 1, userName: 'Anna Nowak' }]);
    expect(sqlOf(spy)).toMatch(/FROM activity_log a LEFT JOIN users u ON u\.id = a\.user_id WHERE a\.user_id IS NOT NULL GROUP BY a\.user_id/);
    expect(sqlOf(spy)).toMatch(/ORDER BY user_name$/);
  });

  it('findRecords: one query per area with ids, existing and archived records with link data', async () => {
    const spy = db(
      [{ id: 21 }],
      [{ id: 7, project_id: 9, archived_at: null }, { id: 8, project_id: 9, archived_at: new Date() }],
      [{ id: 2, login: 'jan@firma.pl', archived_at: null }],
    );
    const found = await q.findRecords(spy, [
      { area: 'leave_requests', id: 21 }, { area: 'leave_requests', id: 22 },
      { area: 'tasks', id: 7 }, { area: 'tasks', id: 8 },
      { area: 'users', id: 2 }, { area: 'leave_pools', id: 2 },
    ]);
    expect(spy.query).toHaveBeenCalledTimes(3);
    expect(sqlOf(spy)).toBe('SELECT id FROM leave_requests WHERE id IN (?)');
    expect(paramsOf(spy)).toEqual([[21, 22]]);
    expect(sqlOf(spy, 1)).toBe('SELECT id, project_id, archived_at FROM tasks WHERE id IN (?)');
    expect(sqlOf(spy, 2)).toBe('SELECT id, login, archived_at FROM users WHERE id IN (?)');
    expect(paramsOf(spy, 2)).toEqual([[2]]);
    expect(found.get('leave_requests:21')).toEqual({ archived: false });
    expect(found.has('leave_requests:22')).toBe(false);
    expect(found.get('tasks:7')).toEqual({ archived: false, projectId: 9 });
    expect(found.get('tasks:8')).toEqual({ archived: true, projectId: 9 });
    expect(found.get('users:2')).toEqual({ archived: false, login: 'jan@firma.pl' });
    expect(found.get('leave_pools:2')).toEqual({ archived: false, login: 'jan@firma.pl' });
  });

  it('findRecords: no entries → no query; projects and types without archive', async () => {
    const none = db();
    expect((await q.findRecords(none, [])).size).toBe(0);
    expect(none.query).not.toHaveBeenCalled();
    const spy = db([{ id: 9 }], [{ id: 3 }], [{ id: 4 }]);
    const found = await q.findRecords(spy, [{ area: 'projects', id: 9 }, { area: 'leave_types', id: 3 }, { area: 'contract_types', id: 4 }]);
    expect(sqlOf(spy)).toBe('SELECT id FROM projects WHERE id IN (?)');
    expect(sqlOf(spy, 1)).toBe('SELECT id FROM leave_types WHERE id IN (?)');
    expect(sqlOf(spy, 2)).toBe('SELECT id FROM contract_types WHERE id IN (?)');
    expect([...found.keys()]).toEqual(['projects:9', 'leave_types:3', 'contract_types:4']);
  });

  it('userNames: names for user ids from changes; none → no query', async () => {
    const spy = db([{ id: 5, name: 'Jan Kowalski' }]);
    expect(await q.userNames(spy, [5, 6])).toEqual(new Map([[5, 'Jan Kowalski']]));
    expect(sqlOf(spy)).toBe('SELECT id, name FROM users WHERE id IN (?)');
    expect(paramsOf(spy)).toEqual([[5, 6]]);
    const none = db();
    expect((await q.userNames(none, [])).size).toBe(0);
    expect(none.query).not.toHaveBeenCalled();
  });
});
