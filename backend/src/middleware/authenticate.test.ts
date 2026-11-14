import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';

vi.mock('../db/pool', () => ({ pool: { query: vi.fn() } }));
const SECRET = 'test-secret-test-secret-test-secret';
process.env.JWT_SECRET = SECRET;

const { pool } = await import('../db/pool');
const { authenticate } = await import('./authenticate');
const { requireAuth } = await import('./requireRole');
const { AUTH_COOKIE_NAME } = await import('../config/constants');
const { USER_ACTIVITY_HEADER } = await import('@app/shared');

const app = express();
app.use(cookieParser());
app.use(authenticate);
app.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const nowSec = () => Math.floor(Date.now() / 1000);
const tokenIssued = (secondsAgo: number) =>
  jwt.sign({ id: 2, iat: nowSec() - secondsAgo }, SECRET, { expiresIn: '31m' });
const cookie = (token: string) => `${AUTH_COOKIE_NAME}=${token}`;
const row = (over: Record<string, unknown> = {}) => ({ id: 2, name: 'Jan Kowalski', role: 'employee', must_change_password: 0, ...over });

beforeEach(() => {
  vi.mocked(pool.query).mockReset();
});

describe('authenticate', () => {
  it('archived account gives 401 on /auth/me', async () => {
    vi.mocked(pool.query).mockResolvedValue([[], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(10)));
    expect(res.status).toBe(401);
    const [sql, params] = vi.mocked(pool.query).mock.calls[0]!;
    expect(sql).toContain('archived_at IS NULL');
    expect(params).toEqual([2]);
  });

  it('role changed in the database is the role in req.user', async () => {
    vi.mocked(pool.query).mockResolvedValue([[row({ role: 'admin', must_change_password: 1 })], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(10)));
    expect(res.body.user).toEqual({ id: 2, name: 'Jan Kowalski', role: 'admin', mustChangePassword: true });
  });

  it('token older than a minute with the activity header gets a new cookie', async () => {
    vi.mocked(pool.query).mockResolvedValue([[row()], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(120))).set(USER_ACTIVITY_HEADER, '1');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain(`${AUTH_COOKIE_NAME}=`);
  });

  it('request without the activity header does not renew the cookie', async () => {
    vi.mocked(pool.query).mockResolvedValue([[row()], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(120)));
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('token younger than a minute is not renewed', async () => {
    vi.mocked(pool.query).mockResolvedValue([[row()], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(30))).set(USER_ACTIVITY_HEADER, '1');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('expired token gives 401', async () => {
    vi.mocked(pool.query).mockResolvedValue([[row()], []] as never);
    const res = await request(app).get('/me').set('Cookie', cookie(tokenIssued(32 * 60)));
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
