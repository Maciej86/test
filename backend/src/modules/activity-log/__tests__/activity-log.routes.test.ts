import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../activity-log.service', () => ({ getList: vi.fn(), getPeople: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../activity-log.service');
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
  return { send, get: (url: string) => send('get', url) };
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
