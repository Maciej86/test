import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../activity-log.queries', () => ({ listEntries: vi.fn(), listPeople: vi.fn(), findRecords: vi.fn(), userNames: vi.fn() }));

const { pool } = await import('../../../db/pool');
const q = await import('../activity-log.queries');
type FoundRecord = import('../activity-log.queries').FoundRecord;
const s = await import('../activity-log.service');

type Entry = Awaited<ReturnType<typeof q.listEntries>>['rows'][number];
const entry = (o: Partial<Entry>): Entry => ({
  id: 1, createdAt: '2026-11-19T13:08:00.000Z', userName: 'Anna Nowak', action: 'update', area: 'tasks',
  entityId: 7, entityName: 'Oferta', entityContext: null, changes: {}, ...o,
});
const list = (rows: Entry[], records: [string, FoundRecord][] = [], names: [number, string][] = []) => {
  vi.mocked(q.listEntries).mockResolvedValue({ rows, total: rows.length });
  vi.mocked(q.findRecords).mockResolvedValue(new Map(records));
  vi.mocked(q.userNames).mockResolvedValue(new Map(names));
};
const query = { page: 1, search: '' };

beforeEach(() => vi.clearAllMocks());

describe('activity-log service', () => {
  it('passes filters with day borders in the app time zone (Warsaw) and the page size', async () => {
    list([]);
    await s.getList({ page: 2, search: 'kowal', area: 'tasks', userId: 7, from: '2026-11-01', to: '2026-11-20' });
    expect(q.listEntries).toHaveBeenCalledWith(pool, {
      page: 2, pageSize: 50, search: 'kowal', area: 'tasks', userId: 7,
      fromAt: new Date('2026-10-31T23:00:00.000Z'), toAt: new Date('2026-11-20T23:00:00.000Z'),
    });
    await s.getList({ page: 1, search: '', from: '2026-07-01' });
    expect(vi.mocked(q.listEntries).mock.calls[1]![1]).toMatchObject({ fromAt: new Date('2026-06-30T22:00:00.000Z'), toAt: undefined });
  });

  it('state: exists, archived or deleted from the record lookup', async () => {
    list(
      [entry({ id: 1, entityId: 7 }), entry({ id: 2, entityId: 8 }), entry({ id: 3, entityId: 9 })],
      [['tasks:7', { archived: false, projectId: 4 }], ['tasks:8', { archived: true, projectId: 4 }]],
    );
    const res = await s.getList(query);
    expect(q.findRecords).toHaveBeenCalledWith(pool, [{ area: 'tasks', id: 7 }, { area: 'tasks', id: 8 }, { area: 'tasks', id: 9 }]);
    expect(res.items.map((i) => i.state)).toEqual(['exists', 'archived', 'deleted']);
    expect(res).toMatchObject({ total: 3, page: 1, pageSize: 50 });
  });

  it('link for each area: leave request, task, project, user, leave pool, leave type, contract type', async () => {
    list(
      [
        entry({ id: 1, area: 'leave_requests', entityId: 21 }),
        entry({ id: 2, area: 'tasks', entityId: 7 }),
        entry({ id: 3, area: 'projects', entityId: 4 }),
        entry({ id: 4, area: 'users', entityId: 2 }),
        entry({ id: 5, area: 'leave_pools', entityId: 2 }),
        entry({ id: 6, area: 'leave_types', entityId: 3 }),
        entry({ id: 7, area: 'contract_types', entityId: 5 }),
      ],
      [
        ['leave_requests:21', { archived: false }],
        ['tasks:7', { archived: false, projectId: 4 }],
        ['projects:4', { archived: false }],
        ['users:2', { archived: false, login: 'jan.kowalski@firma.pl' }],
        ['leave_pools:2', { archived: false, login: 'jan.kowalski@firma.pl' }],
        ['leave_types:3', { archived: false }],
        ['contract_types:5', { archived: false }],
      ],
    );
    expect((await s.getList(query)).items.map((i) => i.link)).toEqual([
      '/admin/leave-requests/21',
      '/admin/tasks/4?task=7',
      '/admin/tasks/4',
      '/admin/employees?search=jan.kowalski%40firma.pl',
      '/admin/employees?search=jan.kowalski%40firma.pl',
      '/admin/leave-types',
      '/admin/contract-types',
    ]);
  });

  it('archived records link to the archive, deleted records have no link', async () => {
    list(
      [
        entry({ id: 1, area: 'users', entityId: 2 }),
        entry({ id: 2, area: 'leave_pools', entityId: 2 }),
        entry({ id: 3, area: 'tasks', entityId: 8 }),
        entry({ id: 4, area: 'projects', entityId: 9 }),
      ],
      [['users:2', { archived: true, login: 'jan k' }], ['leave_pools:2', { archived: true, login: 'jan k' }], ['tasks:8', { archived: true, projectId: 4 }]],
    );
    expect((await s.getList(query)).items.map((i) => [i.state, i.link])).toEqual([
      ['archived', '/admin/archive?tab=employees&search=jan%20k'],
      ['archived', '/admin/archive?tab=employees&search=jan%20k'],
      ['archived', '/admin/archive?tab=tasks&taskId=8'],
      ['deleted', null],
    ]);
  });

  it('person ids in changes become names; a missing account becomes null', async () => {
    list(
      [
        entry({ id: 1, changes: { assignee_ids: { before: [5], after: [5, 6] }, title: { before: 'a', after: 'b' } } }),
        entry({ id: 2, area: 'projects', changes: { added_member_id: { before: null, after: 6 }, member_ids: { before: [], after: [9] } } }),
      ],
      [],
      [[5, 'Jan Kowalski'], [6, 'Ewa Mazur']],
    );
    const res = await s.getList(query);
    expect(q.userNames).toHaveBeenCalledWith(pool, [5, 6, 9]);
    expect(res.items[0]!.changes).toEqual({ assignee_ids: { before: ['Jan Kowalski'], after: ['Jan Kowalski', 'Ewa Mazur'] }, title: { before: 'a', after: 'b' } });
    expect(res.items[1]!.changes).toEqual({ added_member_id: { before: null, after: 'Ewa Mazur' }, member_ids: { before: [], after: [null] } });
  });

  it('people for the filter come from the queries', async () => {
    vi.mocked(q.listPeople).mockResolvedValue([{ userId: 1, userName: 'Anna Nowak' }]);
    expect(await s.getPeople()).toEqual([{ userId: 1, userName: 'Anna Nowak' }]);
  });
});

describe('abuse', () => {
  it('"Open" links stay inside the panel: a login with special characters is encoded, not a new parameter or address', async () => {
    list([entry({ area: 'users', entityId: 2 })], [['users:2', { archived: false, login: 'a&role=admin#//evil.example' }]]);
    const [item] = (await s.getList(query)).items;
    expect(item!.link).toBe('/admin/employees?search=a%26role%3Dadmin%23%2F%2Fevil.example');
  });

  it('a person id that does not exist any more is shown as a deleted account, never as another person', async () => {
    list([entry({ changes: { assignee_ids: { before: [], after: [404] } } })], [], [[5, 'Jan Kowalski']]);
    expect((await s.getList(query)).items[0]!.changes.assignee_ids).toEqual({ before: [], after: [null] });
  });
});

