import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../dashboard.service', () => ({ getDashboard: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../dashboard.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const list = { items: [], total: 0 };
const adminView = { role: 'admin' as const, today: '2026-11-20', pending: list, absences: [], projects: [], overdue: list, myTasks: list };
const employeeView = { role: 'employee' as const, today: '2026-11-20', pool: null, myPending: [], nextLeave: null, myTasks: list };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return { get: (url: string) => request(createApp()).get(`/api${url}`).set('Cookie', cookie) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getDashboard).mockImplementation(async (viewer) => (viewer.role === 'admin' ? adminView : employeeView));
});

describe('dashboard routes', () => {
  it('GET /dashboard without login → 401', async () => {
    expect((await as(null).get('/dashboard')).status).toBe(401);
    expect(s.getDashboard).not.toHaveBeenCalled();
  });

  it('GET /dashboard with a temporary password → 403', async () => {
    expect((await as({ ...jan, mustChangePassword: true }).get('/dashboard')).status).toBe(403);
    expect(s.getDashboard).not.toHaveBeenCalled();
  });

  it('GET /dashboard as admin → role admin with pending, absences, projects, overdue and myTasks', async () => {
    const r = await as(anna).get('/dashboard');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(adminView);
  });

  it('GET /dashboard as employee → role employee without pending, absences, projects and overdue', async () => {
    const r = await as(jan).get('/dashboard');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(employeeView);
    expect(r.body).not.toHaveProperty('absences');
  });

  it('GET /dashboard passes req.user (not query or body) to the service', async () => {
    await as(jan).get('/dashboard?userId=1&role=admin');
    expect(s.getDashboard).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski', role: 'employee' });
  });
});
