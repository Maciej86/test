import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../../../auth/password', () => ({ hashPassword: vi.fn(async (p: string) => `hash(${p})`) }));
const conn = { query: vi.fn() };
vi.mock('../../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../../db/activityLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../db/activityLog')>()),
  logActivity: vi.fn(),
}));
vi.mock('../employees.queries', () => ({
  listEmployees: vi.fn(),
  countEmployees: vi.fn(),
  findAccountsWithLoginOrEmail: vi.fn(),
  findUser: vi.fn(),
  insertUser: vi.fn(),
  updateUser: vi.fn(),
  setTemporaryPassword: vi.fn(),
  setArchived: vi.fn(),
  minOpenYear: vi.fn(),
  findPool: vi.fn(),
  upsertPool: vi.fn(),
  findOpenPoolsForYear: vi.fn(),
  closePool: vi.fn(),
  listActiveUsers: vi.fn(),
}));
vi.mock('../../contract-types/contract-types.queries', () => ({ findContractType: vi.fn(), listSelectableContractTypes: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const q = await import('../employees.queries');
const ct = await import('../../contract-types/contract-types.queries');
const { logActivity } = await import('../../../db/activityLog');
const { withTransaction } = await import('../../../db/transaction');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');
const { todayIsoDate } = await import('@app/shared');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const thisYear = Number(todayIsoDate().slice(0, 4));

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
    put: (url: string, body?: object) => request(app).put(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

const row = (o: Partial<Record<string, unknown>>) => ({
  id: 2, name: 'Jan Kowalski', first_name: 'Jan', last_name: 'Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', hired_on: '2024-03-01', contract_type_id: 1, contract_type_name: 'Umowa o pracę', contract_type_hidden_at: null, annual_days: 26, carried_days: 4, ...o,
});
const newJan = { firstName: 'Jan', lastName: 'Kowalski', login: 'Jan.Kowalski@Firma.pl', email: '', role: 'employee', password: 'Urlop-2026', annualDays: 26, carriedDays: 0 };
const historyOf = () => vi.mocked(logActivity).mock.calls.map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.minOpenYear).mockResolvedValue(2026);
  vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([]);
  vi.mocked(q.countEmployees).mockResolvedValue({ all: 2, admins: 1 });
});

describe('employees routes', () => {
  it('GET /employees without login → 401', async () => {
    expect((await as(null).get('/employees')).status).toBe(401);
  });

  it('GET /employees as employee → 403', async () => {
    expect((await as(jan).get('/employees')).status).toBe(403);
  });

  it('GET /employees: items without password_hash, isMe for req.user, pool null for admin, openYear and counts', async () => {
    vi.mocked(q.listEmployees).mockResolvedValue({
      rows: [row({ id: 1, name: 'Anna Nowak', first_name: 'Anna', last_name: 'Nowak', role: 'admin', annual_days: null, carried_days: null }), row({})] as never,
      total: 2,
    });
    const res = await as(anna).get('/employees');
    expect(res.status).toBe(200);
    expect(res.body.openYear).toBe(2026);
    expect(res.body.counts).toEqual({ all: 2, admins: 1 });
    expect(res.body.total).toBe(2);
    expect(res.body.items[0]).toMatchObject({ id: 1, isMe: true, pool: null });
    expect(res.body.items[1]).toMatchObject({
      id: 2, isMe: false, name: 'Jan Kowalski', firstName: 'Jan', lastName: 'Kowalski', hiredOn: '2024-03-01', contractType: { id: 1, name: 'Umowa o pracę', hidden: false },
      pool: { year: 2026, annualDays: 26, carriedDays: 4, usedDays: 0, pendingDays: 0, leftDays: 30, leftCarriedDays: 4 },
    });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(vi.mocked(q.listEmployees).mock.calls[0]![1]).toMatchObject({ year: 2026, page: 1, sort: 'name', dir: 'asc' });
  });

  it('GET /employees?sort=days_left works; sort=password → 400', async () => {
    vi.mocked(q.listEmployees).mockResolvedValue({ rows: [], total: 0 });
    expect((await as(anna).get('/employees?sort=days_left&dir=desc&role=employee')).status).toBe(200);
    expect(vi.mocked(q.listEmployees).mock.calls[0]![1]).toMatchObject({ sort: 'days_left', dir: 'desc', role: 'employee' });
    expect((await as(anna).get('/employees?sort=password')).status).toBe(400);
  });

  it('open year: no pools yet → the current calendar year', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(null);
    vi.mocked(q.listEmployees).mockResolvedValue({ rows: [], total: 0 });
    expect((await as(anna).get('/employees')).body.openYear).toBe(thisYear);
  });

  it('POST /employees: creates user with hashed temporary password and pool for the open year, history without password', async () => {
    vi.mocked(q.insertUser).mockResolvedValue(7);
    const res = await as(anna).post('/employees', newJan);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7 });
    expect(q.insertUser).toHaveBeenCalledWith(conn, {
      firstName: 'Jan', lastName: 'Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', hiredOn: null, contractTypeId: null,
      passwordHash: 'hash(Urlop-2026)',
    });
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 7, 2026, 26, 0);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(historyOf()).toEqual([
      expect.objectContaining({ userId: 1, userName: 'Anna Nowak', action: 'create', entityType: 'users', entityId: 7 }),
      expect.objectContaining({ action: 'create', entityType: 'leave_pools', entityId: 7 }),
    ]);
    expect(historyOf()[0]!.changes).toMatchObject({ first_name: { before: undefined, after: 'Jan' }, last_name: { before: undefined, after: 'Kowalski' } });
    expect(historyOf()[0]!.changes).not.toHaveProperty('name');
    expect(JSON.stringify(historyOf())).not.toContain('Urlop-2026');
    expect(JSON.stringify(historyOf())).not.toContain('hash(');
  });

  it('POST /employees: an administrator gets no pool', async () => {
    vi.mocked(q.insertUser).mockResolvedValue(8);
    const res = await as(anna).post('/employees', { ...newJan, role: 'admin', annualDays: undefined });
    expect(res.status).toBe(201);
    expect(q.upsertPool).not.toHaveBeenCalled();
  });

  it('POST /employees: active login taken → 409 fields.login = validation.login_taken', async () => {
    vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([
      { id: 3, name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', archived_at: null },
    ] as never);
    const res = await as(anna).post('/employees', newJan);
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toEqual({ login: 'validation.login_taken' });
    expect(res.body.error.archivedUser).toBeUndefined();
    expect(q.insertUser).not.toHaveBeenCalled();
  });

  it('POST /employees: login of archived account (any case) → 409 employees.server.login_taken_archived + archivedUser', async () => {
    vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([
      { id: 9, name: 'Ewa Mazur', login: 'ewa.mazur@firma.pl', email: null, role: 'employee', archived_at: new Date() },
    ] as never);
    const res = await as(anna).post('/employees', { ...newJan, login: 'Ewa.Mazur@Firma.pl ' });
    expect(vi.mocked(q.findAccountsWithLoginOrEmail).mock.calls[0]!.slice(1)).toEqual(['ewa.mazur@firma.pl', null, null]);
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toEqual({ login: 'employees.server.login_taken_archived' });
    expect(res.body.error.archivedUser).toEqual({ id: 9, name: 'Ewa Mazur' });
  });

  it('POST /employees: e-mail taken → 409 fields.email (active and archived)', async () => {
    const other = { id: 3, name: 'Piotr Zieliński', login: 'piotr@firma.pl', email: 'jan@gmail.com', role: 'employee' };
    vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([{ ...other, archived_at: null }] as never);
    let res = await as(anna).post('/employees', { ...newJan, email: 'jan@gmail.com' });
    expect(res.body.error.fields).toEqual({ email: 'validation.email_taken' });
    vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([{ ...other, archived_at: new Date() }] as never);
    res = await as(anna).post('/employees', { ...newJan, email: 'jan@gmail.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toEqual({ email: 'employees.server.email_taken_archived' });
    expect(res.body.error.archivedUser).toEqual({ id: 3, name: 'Piotr Zieliński' });
  });

  it('POST /employees: ER_DUP_ENTRY from the database → 409', async () => {
    vi.mocked(q.insertUser).mockRejectedValue(Object.assign(new Error("Duplicate entry for key 'uq_users_email'"), { code: 'ER_DUP_ENTRY' }));
    const res = await as(anna).post('/employees', { ...newJan, email: 'jan@gmail.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toEqual({ email: 'validation.email_taken' });
  });

  it('POST /employees: wrong data → 400 with field keys', async () => {
    const res = await as(anna).post('/employees', { ...newJan, firstName: '', lastName: 'K', password: 'krotkie' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({ firstName: 'validation.required', lastName: 'validation.too_short', password: 'validation.password_rules' });
  });

  const janUser = { id: 2, name: 'Jan Kowalski', first_name: 'Jan', last_name: 'Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', hired_on: null, contract_type_id: null, archived_at: null };
  const janEdit = { firstName: 'Jan', lastName: 'Kowalski', login: 'jan.kowalski@firma.pl', email: '', role: 'employee', annualDays: 26, carriedDays: 4 };
  const janPool = { id: 11, user_id: 2, year: 2026, annual_days: 26, carried_days: 4, closed_at: null };

  it('PUT /employees/:id: missing or archived → 404', async () => {
    vi.mocked(q.findUser).mockResolvedValue(null);
    expect((await as(anna).put('/employees/2', janEdit)).status).toBe(404);
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, archived_at: new Date() } as never);
    expect((await as(anna).put('/employees/2', janEdit)).status).toBe(404);
    expect((await as(anna).put('/employees/abc', janEdit)).status).toBe(404);
    expect(q.updateUser).not.toHaveBeenCalled();
  });

  it('PUT /employees/:id: own role change → 409 employees.own_role', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, id: 1, name: 'Anna Nowak', first_name: 'Anna', last_name: 'Nowak', role: 'admin' } as never);
    const res = await as(anna).put('/employees/1', { ...janEdit, firstName: 'Anna', lastName: 'Nowak' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.own_role');
    expect(q.updateUser).not.toHaveBeenCalled();
  });

  it('PUT /employees/:id: own name can change', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, id: 1, name: 'Anna Nowak', first_name: 'Anna', last_name: 'Nowak', role: 'admin' } as never);
    const res = await as(anna).put('/employees/1', { ...janEdit, firstName: 'Anna', lastName: 'Nowak-Kowal', role: 'admin', annualDays: undefined });
    expect(res.status).toBe(200);
    expect(q.updateUser).toHaveBeenCalledWith(conn, 1, expect.objectContaining({ firstName: 'Anna', lastName: 'Nowak-Kowal', role: 'admin' }));
    expect(historyOf()[0]!.changes).toEqual({ last_name: { before: 'Nowak', after: 'Nowak-Kowal' } });
  });

  it('PUT /employees/:id: login taken by another account → 409, own login is not a conflict', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    vi.mocked(q.findPool).mockResolvedValue(janPool as never);
    await as(anna).put('/employees/2', janEdit);
    expect(vi.mocked(q.findAccountsWithLoginOrEmail).mock.calls[0]!.slice(1)).toEqual(['jan.kowalski@firma.pl', null, 2]);
    vi.mocked(q.findAccountsWithLoginOrEmail).mockResolvedValue([{ ...janUser, id: 5, login: 'piotr@firma.pl' }] as never);
    const res = await as(anna).put('/employees/2', { ...janEdit, login: 'piotr@firma.pl' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toEqual({ login: 'validation.login_taken' });
  });

  it('PUT /employees/:id: employee pool saved for the open year; carried 70 ok', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    vi.mocked(q.findPool).mockResolvedValue(janPool as never);
    const res = await as(anna).put('/employees/2', { ...janEdit, annualDays: 20, carriedDays: 70 });
    expect(res.status).toBe(200);
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 2, 2026, 20, 70);
    expect(historyOf()).toEqual([
      expect.objectContaining({
        action: 'update', entityType: 'leave_pools', entityId: 2,
        changes: { annual_days: { before: 26, after: 20 }, carried_days: { before: 4, after: 70 } },
      }),
    ]);
  });

  it('PUT /employees/:id: role change is saved with history; admin role leaves the pool untouched', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    const res = await as(anna).put('/employees/2', { ...janEdit, role: 'admin', annualDays: undefined });
    expect(res.status).toBe(200);
    expect(q.upsertPool).not.toHaveBeenCalled();
    expect(historyOf()).toEqual([
      expect.objectContaining({ action: 'update', entityType: 'users', changes: { role: { before: 'employee', after: 'admin' } } }),
    ]);
  });

  it('PUT /employees/:id: employee → admin → employee keeps the same pool row', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, role: 'admin' } as never);
    vi.mocked(q.findPool).mockResolvedValue(janPool as never);
    const res = await as(anna).put('/employees/2', janEdit);
    expect(res.status).toBe(200);
    expect(q.findPool).toHaveBeenCalledWith(conn, 2, 2026);
    expect(q.upsertPool).not.toHaveBeenCalled();
  });

  it('PUT /employees/:id: admin → employee without a pool gets one for the open year', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, role: 'admin' } as never);
    vi.mocked(q.findPool).mockResolvedValue(null);
    await as(anna).put('/employees/2', janEdit);
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 2, 2026, 26, 4);
    expect(historyOf()).toContainEqual(expect.objectContaining({ action: 'create', entityType: 'leave_pools' }));
  });

  it('PUT /employees/:id: hire date and contract type saved with history', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    vi.mocked(q.findPool).mockResolvedValue(janPool as never);
    vi.mocked(ct.findContractType).mockResolvedValue({ id: 2, name: 'Umowa zlecenie', hidden: false });
    const res = await as(anna).put('/employees/2', { ...janEdit, hiredOn: '2024-03-01', contractTypeId: 2 });
    expect(res.status).toBe(200);
    expect(q.updateUser).toHaveBeenCalledWith(conn, 2, expect.objectContaining({ hiredOn: '2024-03-01', contractTypeId: 2 }));
    expect(historyOf()[0]!.changes).toEqual({
      hired_on: { before: null, after: '2024-03-01' },
      contract_type: { before: null, after: 'Umowa zlecenie' },
    });
  });

  it('PUT /employees/:id: hire date 2024-02-30 or contract kot → 400', async () => {
    expect((await as(anna).put('/employees/2', { ...janEdit, hiredOn: '2024-02-30' })).status).toBe(400);
    expect((await as(anna).put('/employees/2', { ...janEdit, contractTypeId: 'kot' })).status).toBe(400);
    expect(q.updateUser).not.toHaveBeenCalled();
  });

  it('PUT /employees/:id: no changes → no history entry', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    vi.mocked(q.findPool).mockResolvedValue(janPool as never);
    expect((await as(anna).put('/employees/2', janEdit)).status).toBe(200);
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('POST /employees/:id/password: temporary password, history without password or hash', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    const res = await as(anna).post('/employees/2/password', { password: 'Sosna-48-Kruk!' });
    expect(res.status).toBe(200);
    expect(q.setTemporaryPassword).toHaveBeenCalledWith(conn, 2, 'hash(Sosna-48-Kruk!)');
    expect(historyOf()).toEqual([
      expect.objectContaining({ action: 'update', entityType: 'users', entityId: 2, changes: { password: { before: null, after: 'reset' } } }),
    ]);
    expect(JSON.stringify([res.body, historyOf()])).not.toMatch(/Sosna|hash\(/);
  });

  it('POST /employees/:id/password: weak password → 400, archived → 404', async () => {
    expect((await as(anna).post('/employees/2/password', { password: 'krotkie' })).status).toBe(400);
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, archived_at: new Date() } as never);
    expect((await as(anna).post('/employees/2/password', { password: 'Sosna-48-Kruk!' })).status).toBe(404);
  });

  it('POST /employees/:id/archive: own account → 409 archive_self; already archived → 409', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, id: 1, role: 'admin' } as never);
    let res = await as(anna).post('/employees/1/archive');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.archive_self');
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, archived_at: new Date() } as never);
    res = await as(anna).post('/employees/2/archive');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.already_archived');
    vi.mocked(q.findUser).mockResolvedValue(null);
    expect((await as(anna).post('/employees/2/archive')).status).toBe(404);
    expect(q.setArchived).not.toHaveBeenCalled();
  });

  it('POST /employees/:id/archive: archives with the author and history', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    expect((await as(anna).post('/employees/2/archive')).status).toBe(200);
    expect(q.setArchived).toHaveBeenCalledWith(conn, 2, 1);
    expect(historyOf()).toEqual([expect.objectContaining({ action: 'archive', entityType: 'users', entityId: 2 })]);
  });

  it('POST /employees/:id/restore: active → 409 not_archived; archived → restored with history', async () => {
    vi.mocked(q.findUser).mockResolvedValue(janUser as never);
    let res = await as(anna).post('/employees/2/restore');
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.not_archived');
    vi.mocked(q.findUser).mockResolvedValue({ ...janUser, archived_at: new Date() } as never);
    res = await as(anna).post('/employees/2/restore');
    expect(res.status).toBe(200);
    expect(q.setArchived).toHaveBeenCalledWith(conn, 2, null);
    expect(historyOf()).toEqual([expect.objectContaining({ action: 'restore', entityType: 'users', entityId: 2 })]);
  });

  const yearPool = (o: Record<string, unknown>) => ({
    id: 11, user_id: 2, year: 2026, annual_days: 26, carried_days: 4, closed_at: null, name: 'Jan Kowalski', role: 'employee', archived_at: null, ...o,
  });

  it('GET /employees/close-year: preview with left days, canClose', async () => {
    vi.mocked(q.findOpenPoolsForYear).mockResolvedValue([
      yearPool({}),
      yearPool({ id: 12, user_id: 9, name: 'Ewa Mazur', archived_at: new Date() }),
      yearPool({ id: 13, user_id: 1, name: 'Anna Nowak', role: 'admin' }),
    ] as never);
    const res = await as(anna).get('/employees/close-year');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      year: 2026, nextYear: 2027, canClose: 2026 <= thisYear, pendingRequests: 0,
      rows: [{ userId: 2, name: 'Jan Kowalski', left: 30, annualDays: 26 }],
    });
  });

  it('POST /employees/close-year: 26+4 → new pool with typed annual and 30 carried; archived get last annual', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(thisYear);
    vi.mocked(q.findOpenPoolsForYear).mockResolvedValue([
      yearPool({ year: thisYear }),
      yearPool({ id: 12, user_id: 9, year: thisYear, annual_days: 20, carried_days: 0, name: 'Ewa Mazur', archived_at: new Date() }),
    ] as never);
    const res = await as(anna).post('/employees/close-year', { year: thisYear, pools: [{ userId: 2, annualDays: 24 }] });
    expect(res.status).toBe(200);
    expect(q.closePool).toHaveBeenCalledWith(conn, 11);
    expect(q.closePool).toHaveBeenCalledWith(conn, 12);
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 2, thisYear + 1, 24, 30);
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 9, thisYear + 1, 20, 20);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(historyOf()).toContainEqual(expect.objectContaining({
      action: 'update', entityType: 'leave_pools', entityId: 2,
      changes: { closed_year: { before: null, after: thisYear }, annual_days: { before: 26, after: 24 }, carried_days: { before: 4, after: 30 } },
    }));
  });

  it('POST /employees/close-year twice for the same year → 409 year_not_open', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(thisYear + 1);
    const res = await as(anna).post('/employees/close-year', { year: thisYear, pools: [] });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.year_not_open');
    expect(q.closePool).not.toHaveBeenCalled();
  });

  it('POST /employees/close-year for a year after the current one → 409 year_too_early', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(thisYear + 1);
    const res = await as(anna).post('/employees/close-year', { year: thisYear + 1, pools: [] });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('employees.server.year_too_early');
  });

  it('POST /employees/close-year ignores unknown userIds', async () => {
    vi.mocked(q.minOpenYear).mockResolvedValue(thisYear);
    vi.mocked(q.findOpenPoolsForYear).mockResolvedValue([yearPool({ year: thisYear })] as never);
    await as(anna).post('/employees/close-year', { year: thisYear, pools: [{ userId: 77, annualDays: 10 }] });
    expect(q.upsertPool).toHaveBeenCalledTimes(1);
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 2, thisYear + 1, 26, 30);
  });

  it('account archived during the session → 401 on the next request', async () => {
    const app = as(anna);
    vi.mocked(users.findActiveUserById).mockResolvedValue(null);
    expect((await app.get('/employees')).status).toBe(401);
  });
});

describe('contract types at employees', () => {
  const unavailable = { status: 400, body: { error: { message: 'validation.invalid', fields: { contractTypeId: 'employees.server.contract_type_unavailable' } } } };
  const visible = { id: 2, name: 'Umowa zlecenie', hidden: false };
  const hidden = { id: 5, name: 'Umowa o staż', hidden: true };
  const mary = { id: 3, name: 'Maria Lis', first_name: 'Maria', last_name: 'Lis', login: 'maria.lis@firma.pl', email: null, role: 'employee', hired_on: null, contract_type_id: 5, archived_at: null };
  const maryEdit = { firstName: 'Maria', lastName: 'Lis', login: 'maria.lis@firma.pl', email: '', role: 'employee', annualDays: 26, carriedDays: 0, contractTypeId: 5 };
  const expectUnavailable = (res: { status: number; body: unknown }) => {
    expect(res.status).toBe(unavailable.status);
    expect((res.body as { error: { fields: unknown } }).error.fields).toEqual(unavailable.body.error.fields);
  };

  beforeEach(() => {
    vi.mocked(q.insertUser).mockResolvedValue(7);
    vi.mocked(q.findPool).mockResolvedValue({ id: 12, user_id: 3, year: 2026, annual_days: 26, carried_days: 0, closed_at: null } as never);
  });

  it('add with a visible type → 201; with hidden or missing type → 400 contract_type_unavailable', async () => {
    vi.mocked(ct.findContractType).mockResolvedValueOnce(visible);
    const ok = await as(anna).post('/employees', { ...newJan, contractTypeId: 2 });
    expect(ok.status).toBe(201);
    expect(q.insertUser).toHaveBeenCalledWith(conn, expect.objectContaining({ contractTypeId: 2 }));
    // Odczyt typu blokuje go do końca zapisu, żeby równoczesne „Ukryj” nie przeszło w połowie.
    expect(ct.findContractType).toHaveBeenCalledWith(conn, 2, { forShare: true });
    expect(historyOf()[0]!.changes).toMatchObject({ contract_type: { before: undefined, after: 'Umowa zlecenie' } });
    vi.mocked(q.insertUser).mockClear();

    vi.mocked(ct.findContractType).mockResolvedValueOnce(hidden);
    expectUnavailable(await as(anna).post('/employees', { ...newJan, contractTypeId: 5 }));
    vi.mocked(ct.findContractType).mockResolvedValueOnce(null);
    expectUnavailable(await as(anna).post('/employees', { ...newJan, contractTypeId: 99 }));
    expect(q.insertUser).not.toHaveBeenCalled();
  });

  it('null contract type → saved without a type, no type lookup', async () => {
    expect((await as(anna).post('/employees', { ...newJan, contractTypeId: null })).status).toBe(201);
    expect(q.insertUser).toHaveBeenCalledWith(conn, expect.objectContaining({ contractTypeId: null }));
    expect(ct.findContractType).not.toHaveBeenCalled();
  });

  it('edit of a person with a hidden type without change → 200; change to another hidden → 400', async () => {
    vi.mocked(q.findUser).mockResolvedValue(mary as never);
    vi.mocked(ct.findContractType).mockResolvedValue(hidden);
    const res = await as(anna).put('/employees/3', { ...maryEdit, email: 'maria@firma.pl' });
    expect(res.status).toBe(200);
    expect(q.updateUser).toHaveBeenCalledWith(conn, 3, expect.objectContaining({ contractTypeId: 5, email: 'maria@firma.pl' }));
    expect(historyOf()[0]!.changes).toEqual({ email: { before: null, after: 'maria@firma.pl' } });
    vi.mocked(q.updateUser).mockClear();

    vi.mocked(ct.findContractType).mockResolvedValue({ id: 6, name: 'Umowa agencyjna', hidden: true });
    expectUnavailable(await as(anna).put('/employees/3', { ...maryEdit, contractTypeId: 6 }));
    expect(q.updateUser).not.toHaveBeenCalled();
  });

  it('history saves type names before and after', async () => {
    vi.mocked(q.findUser).mockResolvedValue({ ...mary, contract_type_id: 1 } as never);
    vi.mocked(ct.findContractType).mockImplementation(async (_db, id) => (id === 1 ? { id: 1, name: 'Umowa o pracę', hidden: false } : { id: 4, name: 'B2B', hidden: false }));
    expect((await as(anna).put('/employees/3', { ...maryEdit, contractTypeId: 4 })).status).toBe(200);
    expect(historyOf()[0]!.changes).toEqual({ contract_type: { before: 'Umowa o pracę', after: 'B2B' } });
  });

  it('list has contractType with name and hidden; no type → null', async () => {
    vi.mocked(q.listEmployees).mockResolvedValue({
      rows: [row({ contract_type_id: 5, contract_type_name: 'Umowa o staż', contract_type_hidden_at: new Date() }), row({ id: 3, contract_type_id: null, contract_type_name: null })] as never,
      total: 2,
    });
    const res = await as(anna).get('/employees');
    expect(res.body.items[0].contractType).toEqual({ id: 5, name: 'Umowa o staż', hidden: true });
    expect(res.body.items[1].contractType).toBeNull();
  });

  it('GET /employees/contract-types → visible types in order; 401; 403', async () => {
    vi.mocked(ct.listSelectableContractTypes).mockResolvedValue([{ id: 1, name: 'Umowa o pracę' }, { id: 4, name: 'B2B' }]);
    const res = await as(anna).get('/employees/contract-types');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [{ id: 1, name: 'Umowa o pracę' }, { id: 4, name: 'B2B' }] });
    expect((await as(null).get('/employees/contract-types')).status).toBe(401);
    expect((await as(jan).get('/employees/contract-types')).status).toBe(403);
  });
});
