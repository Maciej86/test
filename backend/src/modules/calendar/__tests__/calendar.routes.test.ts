import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../calendar.service', () => ({ getCalendar: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../calendar.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const view = { from: '2026-11-17', to: '2027-01-16', today: '2026-11-17', people: [], absences: [], todayOff: [] };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return { get: (url: string) => request(createApp()).get(`/api${url}`).set('Cookie', cookie) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getCalendar).mockResolvedValue(view);
});

describe('calendar routes', () => {
  it('GET /calendar without login → 401', async () => {
    expect((await as(null).get('/calendar')).status).toBe(401);
    expect(s.getCalendar).not.toHaveBeenCalled();
  });

  it('GET /calendar as employee → 403', async () => {
    expect((await as(jan).get('/calendar')).status).toBe(403);
    expect(s.getCalendar).not.toHaveBeenCalled();
  });

  it('GET /calendar as admin without from → service gets null (today)', async () => {
    const r = await as(anna).get('/calendar');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(view);
    expect(s.getCalendar).toHaveBeenCalledWith(null);
  });

  it('GET /calendar?from=2026-12-01 → service gets that day; extra parameters ignored', async () => {
    await as(anna).get('/calendar?from=2026-12-01&to=2030-01-01&userId=5');
    expect(s.getCalendar).toHaveBeenCalledWith('2026-12-01');
  });

  it('GET /calendar with a bad from → 400 with field from', async () => {
    for (const [from, key] of [['2026-02-30', 'validation.date'], ['1999-12-31', 'validation.min'], ['2100-01-01', 'validation.max']]) {
      const r = await as(anna).get(`/calendar?from=${from}`);
      expect(r.status).toBe(400);
      expect(r.body.error.fields).toEqual({ from: key });
    }
    expect(s.getCalendar).not.toHaveBeenCalled();
  });
});
