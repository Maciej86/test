import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../my-leave.service', () => ({
  getMyLeaveOverview: vi.fn(),
  listMyRequests: vi.fn(),
  createRequest: vi.fn(),
  withdrawRequest: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../my-leave.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');
const { MY_LEAVE_MESSAGES: M } = await import('@app/shared');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 7, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

const body = { leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', comment: 'Święta u rodziców.' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('my leave routes', () => {
  it('without login → 401', async () => {
    expect((await as(null).get('/my-leave/overview')).status).toBe(401);
    expect((await as(null).get('/my-leave/requests')).status).toBe(401);
    expect((await as(null).post('/my-leave/requests', body)).status).toBe(401);
    expect((await as(null).post('/my-leave/requests/3/withdraw')).status).toBe(401);
  });

  it('as admin → 403', async () => {
    expect((await as(anna).get('/my-leave/overview')).status).toBe(403);
    expect((await as(anna).get('/my-leave/requests')).status).toBe(403);
    expect((await as(anna).post('/my-leave/requests', body)).status).toBe(403);
    expect((await as(anna).post('/my-leave/requests/3/withdraw')).status).toBe(403);
  });

  it('GET /my-leave/overview → 200 for req.user.id; no pool → 404 no_pool', async () => {
    const overview = { pool: { year: 2026 }, types: [], years: [2026], busy: [] };
    vi.mocked(s.getMyLeaveOverview).mockResolvedValueOnce(overview as never);
    const res = await as(jan).get('/my-leave/overview?userId=1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(overview);
    expect(s.getMyLeaveOverview).toHaveBeenCalledWith(7);

    vi.mocked(s.getMyLeaveOverview).mockResolvedValueOnce(null);
    const none = await as(jan).get('/my-leave/overview');
    expect(none.status).toBe(404);
    expect(none.body.error.message).toBe(M.noPool);
  });

  it('GET /my-leave/requests?year=2025 → list of req.user.id; ?year=abc → 400', async () => {
    vi.mocked(s.listMyRequests).mockResolvedValue({ year: 2025, items: [] });
    const res = await as(jan).get('/my-leave/requests?year=2025');
    expect(res.status).toBe(200);
    expect(s.listMyRequests).toHaveBeenCalledWith(7, 2025);
    await as(jan).get('/my-leave/requests');
    expect(s.listMyRequests).toHaveBeenLastCalledWith(7, undefined);

    expect((await as(jan).get('/my-leave/requests?year=abc')).status).toBe(400);
    expect((await as(jan).get('/my-leave/requests?year=1999')).status).toBe(400);
  });

  it.todo('POST /my-leave/requests → 201; user id from req.user, server-counted values ignored');
  it.todo('POST /my-leave/requests with bad data → 400 with fields');
  it.todo('POST /my-leave/requests/:id/withdraw → 200; abc → 404');
});
