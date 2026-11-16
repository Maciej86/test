import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../notifications.service', () => ({
  getSummary: vi.fn(),
  getList: vi.fn(),
  readOne: vi.fn(),
  readAll: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../notifications.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getSummary).mockResolvedValue({ unread: 0, latest: [] });
  vi.mocked(s.getList).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, unread: 0 });
  vi.mocked(s.readOne).mockResolvedValue({ ok: true });
  vi.mocked(s.readAll).mockResolvedValue({ updated: 0 });
});

describe('notifications routes', () => {
  it('GET /notifications/summary without login → 401', async () => {
    expect((await as(null).get('/notifications/summary')).status).toBe(401);
    expect((await as(null).post('/notifications/read-all')).status).toBe(401);
  });

  it('with temporary password → 403', async () => {
    const res = await as({ ...jan, mustChangePassword: true }).get('/notifications/summary');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('server.password_change_required');
  });

  it('GET /notifications/summary → own summary, for both roles', async () => {
    const latest = [{ id: 7, type: 'leave_approved', params: {}, actorName: 'Anna Nowak', link: '/admin/my-leave', readAt: null, createdAt: '2026-11-16T10:32:00.000Z' }];
    vi.mocked(s.getSummary).mockResolvedValue({ unread: 1, latest } as never);
    const res = await as(jan).get('/notifications/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ unread: 1, latest });
    expect(s.getSummary).toHaveBeenCalledWith(2);
    expect((await as(anna).get('/notifications/summary')).status).toBe(200);
    expect(s.getSummary).toHaveBeenLastCalledWith(1);
  });

  it('GET /notifications → own list with query; unread=2 → 400', async () => {
    const res = await as(anna).get('/notifications?page=2&unread=1&userId=2');
    expect(res.status).toBe(200);
    expect(s.getList).toHaveBeenCalledWith(1, { page: 2, unread: '1' });
    const bad = await as(anna).get('/notifications?unread=2');
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toEqual({ unread: 'validation.list_filter' });
  });

  it('POST /notifications/:id/read → 204; not a number or someone else\'s → 404', async () => {
    const ok = await as(jan).post('/notifications/7/read');
    expect(ok.status).toBe(204);
    expect(s.readOne).toHaveBeenCalledWith(2, 7);
    expect((await as(jan).post('/notifications/1e3/read')).status).toBe(404);
    vi.mocked(s.readOne).mockResolvedValue({ error: { status: 404, message: 'server.not_found' } });
    const other = await as(jan).post('/notifications/9/read');
    expect(other.status).toBe(404);
    expect(other.body.error.message).toBe('server.not_found');
  });

  it('POST /notifications/read-all → updated count of own notifications', async () => {
    vi.mocked(s.readAll).mockResolvedValue({ updated: 5 });
    const res = await as(jan).post('/notifications/read-all', { userId: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ updated: 5 });
    expect(s.readAll).toHaveBeenCalledWith(2);
  });
});

describe('abuse', () => {
  it('someone else\'s notification: marking it gives 404 like a missing one', async () => {
    vi.mocked(s.readOne).mockResolvedValue({ error: { status: 404, message: 'server.not_found' } });
    const res = await as(anna).post('/notifications/9/read');
    expect(res.status).toBe(404);
    expect(s.readOne).toHaveBeenCalledWith(1, 9);
  });

  it('forged ids in the address → 404 without touching the database', async () => {
    for (const id of ['0', '-1', '1.5', 'abc', '0x10', '007', '99999999999']) {
      expect((await as(jan).post(`/notifications/${id}/read`)).status).toBe(404);
    }
    expect(s.readOne).not.toHaveBeenCalled();
  });

  it('forged owner in the address or body is ignored: always req.user', async () => {
    await as(jan).get('/notifications/summary?userId=1');
    expect(s.getSummary).toHaveBeenCalledWith(2);
    await as(jan).get('/notifications?userId=1&user_id=1');
    expect(s.getList).toHaveBeenCalledWith(2, { page: 1, unread: '0' });
    await as(jan).post('/notifications/read-all', { userId: 1, user_id: 1 });
    expect(s.readAll).toHaveBeenCalledWith(2);
    await as(jan).post('/notifications/7/read', { userId: 1, readAt: '2000-01-01' });
    expect(s.readOne).toHaveBeenCalledWith(2, 7);
  });

  it('clicking twice at once: both answers are fine', async () => {
    const e = as(jan);
    const [a, b] = await Promise.all([e.post('/notifications/7/read'), e.post('/notifications/7/read')]);
    expect([a.status, b.status]).toEqual([204, 204]);
    const [c, d] = await Promise.all([e.post('/notifications/read-all'), e.post('/notifications/read-all')]);
    expect([c.status, d.status]).toEqual([200, 200]);
  });

  it('deleting a person deletes their notifications (ON DELETE CASCADE), nothing else', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(new URL('../../../../migrations/010_notifications.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/FOREIGN KEY \(user_id\) REFERENCES users \(id\) ON DELETE CASCADE/);
    expect(sql).not.toMatch(/actor_name[^\n]*REFERENCES/);
  });

  it('a huge page number does not break the list', async () => {
    const res = await as(jan).get('/notifications?page=99999999999999999999');
    expect(res.status).toBe(200);
  });
});
