import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../../auth/password', () => ({ hashPassword: vi.fn(async (p: string) => `hash(${p})`) }));
const conn = { query: vi.fn() };
vi.mock('../../db/transaction', () => ({ withTransaction: vi.fn(async (work: (c: unknown) => unknown) => work(conn)) }));
vi.mock('../../db/activityLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../db/activityLog')>()),
  logActivity: vi.fn(),
}));
vi.mock('./employees.queries', () => ({
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
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../auth/users.queries');
const q = await import('./employees.queries');
const { logActivity } = await import('../../db/activityLog');
const { withTransaction } = await import('../../db/transaction');
const { createApp } = await import('../../app');
const { signToken } = await import('../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../config/constants');
const { todayIsoDate } = await import('@app/shared');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const thisYear = Number(todayIsoDate().slice(0, 4));

function as(user: SessionUser | null) {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
    put: (url: string, body?: object) => request(app).put(`/api${url}`).set('Cookie', cookie).send(body),
  };
}

const row = (o: Partial<Record<string, unknown>>) => ({
  id: 2, name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', annual_days: 26, carried_days: 4, ...o,
});
const newJan = { name: 'Jan Kowalski', login: 'Jan.Kowalski@Firma.pl', email: '', role: 'employee', password: 'Urlop-2026', annualDays: 26, carriedDays: 0 };
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
      rows: [row({ id: 1, name: 'Anna Nowak', role: 'admin', annual_days: null, carried_days: null }), row({})] as never,
      total: 2,
    });
    const res = await as(anna).get('/employees');
    expect(res.status).toBe(200);
    expect(res.body.openYear).toBe(2026);
    expect(res.body.counts).toEqual({ all: 2, admins: 1 });
    expect(res.body.total).toBe(2);
    expect(res.body.items[0]).toMatchObject({ id: 1, isMe: true, pool: null });
    expect(res.body.items[1]).toMatchObject({
      id: 2, isMe: false,
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
      name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', passwordHash: 'hash(Urlop-2026)',
    });
    expect(q.upsertPool).toHaveBeenCalledWith(conn, 7, 2026, 26, 0);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(historyOf()).toEqual([
      expect.objectContaining({ userId: 1, userName: 'Anna Nowak', action: 'create', entityType: 'users', entityId: 7 }),
      expect.objectContaining({ action: 'create', entityType: 'leave_pools', entityId: 7 }),
    ]);
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
    const res = await as(anna).post('/employees', { ...newJan, name: '', password: 'krotkie' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({ name: 'validation.required', password: 'validation.password_rules' });
  });

  it.todo('PUT /employees/:id: missing or archived → 404');
  it.todo('PUT /employees/:id: own role change → 409 employees.own_role');
  it.todo('PUT /employees/:id: employee pool saved for the open year; carried 70 ok');
  it.todo('PUT /employees/:id: employee → admin → employee keeps the same pool row');
  it.todo('PUT /employees/:id: no changes → no history entry');
  it.todo('POST /employees/:id/password: temporary password, history without password or hash');
  it.todo('POST /employees/:id/archive: own account → 409 archive_self; already archived → 409');
  it.todo('POST /employees/:id/restore: active → 409 not_archived; archived → restored with history');
  it.todo('GET /employees/close-year: preview with left days, canClose');
  it.todo('POST /employees/close-year: 26+4-9 → new pool 26 with 21 carried; archived get last annual');
  it.todo('POST /employees/close-year twice for the same year → 409 year_not_open');
  it.todo('POST /employees/close-year for a year after the current one → 409 year_too_early');
  it.todo('POST /employees/close-year ignores unknown userIds');
  it.todo('account archived during the session → 401 on the next request');
});
