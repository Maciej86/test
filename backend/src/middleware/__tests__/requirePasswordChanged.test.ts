import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../auth/users.queries', () => ({
  findActiveUserById: vi.fn(),
  findActiveUserByLogin: vi.fn(),
  findPasswordHash: vi.fn(),
  updatePassword: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const queries = await import('../../auth/users.queries');
const { createApp } = await import('../../app');
const { signToken } = await import('../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../config/constants');

const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const temporary: SessionUser = { ...jan, mustChangePassword: true };
const cookie = `${AUTH_COOKIE_NAME}=${signToken(jan, 0)}`;

const appWithModule = () => {
  const extra = express.Router();
  extra.get('/test/data', (_req, res) => {
    res.json({ ok: true });
  });
  return createApp({ extraRoutes: extra });
};

beforeEach(() => {
  vi.mocked(queries.findActiveUserById).mockReset();
});

describe('requirePasswordChanged', () => {
  it('module routes return 403 password_change_required for a temporary password', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    const res = await request(appWithModule()).get('/api/test/data').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('server.password_change_required');
  });

  it('module routes work after the password is changed', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(jan);
    const res = await request(appWithModule()).get('/api/test/data').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('me, logout and change-password stay available with a temporary password', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    const app = appWithModule();
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
    const change = await request(app).post('/api/auth/change-password').set('Cookie', cookie).send({});
    expect(change.status).toBe(400);
  });
});
