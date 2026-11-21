import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../activity-log.service', () => ({ getList: vi.fn(), getPeople: vi.fn() }));
vi.mock('../../leave-types/leave-types.service', () => ({ listTypes: vi.fn(), createType: vi.fn(), updateType: vi.fn(), moveType: vi.fn(), hideType: vi.fn(), unhideType: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../activity-log.service');
const leaveTypes = await import('../../leave-types/leave-types.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  const send = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string) =>
    request(app)[method](`/api${url}`).set('Cookie', cookie).set('Origin', process.env.FRONTEND_URL ?? 'http://localhost:5173');
  return { send, get: (url: string) => send('get', url), post: (url: string, body: object) => send('post', url).send(body) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getList).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });
  vi.mocked(s.getPeople).mockResolvedValue([{ userId: 1, userName: 'Anna Nowak' }]);
});

describe('activity-log routes', () => {
  it('GET /activity-log without login → 401', async () => {
    expect((await as(null).get('/activity-log')).status).toBe(401);
    expect((await as(null).get('/activity-log/people')).status).toBe(401);
  });

  it('GET /activity-log as employee → 403', async () => {
    expect((await as(jan).get('/activity-log')).status).toBe(403);
    expect((await as(jan).get('/activity-log/people')).status).toBe(403);
    expect(s.getList).not.toHaveBeenCalled();
  });

  it('GET /activity-log as admin → list with filters from the query', async () => {
    const res = await as(anna).get('/activity-log?search=kowal&area=tasks&userId=7&from=2026-11-01&to=2026-11-20');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
    expect(s.getList).toHaveBeenCalledWith({ page: 1, search: 'kowal', area: 'tasks', userId: 7, from: '2026-11-01', to: '2026-11-20' });
  });

  it('GET /activity-log second page', async () => {
    await as(anna).get('/activity-log?page=2');
    expect(s.getList).toHaveBeenCalledWith({ page: 2, search: '' });
  });

  it('GET /activity-log with bad filter values drops them; to before from → 400', async () => {
    await as(anna).get('/activity-log?area=orders&userId=1e3&from=2026-02-30');
    expect(s.getList).toHaveBeenCalledWith({ page: 1, search: '' });
    const res = await as(anna).get('/activity-log?from=2026-11-20&to=2026-11-19');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ to: 'activity-log.validation.dates_order' });
  });

  it('GET /activity-log/people as admin → authors', async () => {
    const res = await as(anna).get('/activity-log/people');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ userId: 1, userName: 'Anna Nowak' }]);
  });

  it('no write routes: POST, PUT, PATCH, DELETE → 404', async () => {
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      for (const url of ['/activity-log', '/activity-log/1']) {
        expect((await as(anna).send(method, url)).status).toBe(404);
      }
    }
  });
});

describe('abuse', () => {
  it('an employee gets 403 on every activity-log address, also with forged query parameters', async () => {
    for (const url of ['/activity-log', '/activity-log/people', '/activity-log?userId=2&area=users', '/activity-log?role=admin']) {
      expect((await as(jan).get(url)).status).toBe(403);
    }
    expect(s.getList).not.toHaveBeenCalled();
    expect(s.getPeople).not.toHaveBeenCalled();
  });

  it('nobody can write, change or delete history entries, not even an admin', async () => {
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      for (const url of ['/activity-log', '/activity-log/1', '/activity-log/people']) {
        expect((await as(anna).send(method, url)).status).toBe(404);
      }
    }
  });

  it('forged query: SQL in search stays a parameter; unknown fields, sort, ids like 1e3 or 0x10 and huge pages are dropped or clamped', async () => {
    await as(anna).get(`/activity-log?search=${encodeURIComponent("x' OR 1=1; DROP TABLE activity_log; --")}&sort=user_id&dir=desc&entityType=users&userId=0x10&page=-5`);
    expect(s.getList).toHaveBeenLastCalledWith({ page: 1, search: "x' OR 1=1; DROP TABLE activity_log; --" });
    await as(anna).get(`/activity-log?search=${'x'.repeat(101)}&area=users%27--&userId=007&from=2026-13-01`);
    expect(s.getList).toHaveBeenLastCalledWith({ page: 1, search: '' });
  });

  it('who made a change comes from the session, never from the request body', async () => {
    vi.mocked(leaveTypes.createType).mockResolvedValue({ id: 6 });
    const res = await as(anna).post('/leave-types', { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'working', requiresApproval: true, userId: 99, userName: 'Ktoś inny', actor: { id: 99 } });
    expect(res.status).toBe(201);
    expect(leaveTypes.createType).toHaveBeenCalledWith({ name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'working', requiresApproval: true }, { id: 1, name: 'Anna Nowak' });
  });
});

