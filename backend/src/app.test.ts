import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

vi.mock('./db/pool', () => ({ pool: { query: vi.fn() } }));

const SECRET = 'test-secret-test-secret-test-secret';
process.env.JWT_SECRET = SECRET;

const { pool } = await import('./db/pool');
const { createApp } = await import('./app');
const { signToken } = await import('./auth/token');
const { requireRole } = await import('./middleware/requireRole');
const { validateBody } = await import('./middleware/validateBody');
const { AUTH_COOKIE_NAME } = await import('./config/constants');
const { env } = await import('./env');

const { mountModule } = await import('./middleware/mountModule');

function appWithTestRoutes() {
  const extra = express.Router();
  extra.get('/test/admin-only', requireRole('admin'), (_req, res) => {
    res.json({ ok: true });
  });
  // Trasa, przy której „zapomniano” requireRole: i tak wymaga logowania.
  extra.get('/test/forgotten', (_req, res) => {
    res.json({ ok: true });
  });
  const publicRoutes = express.Router();
  publicRoutes.post(
    '/test/form',
    validateBody(z.object({ email: z.email('validation.email_invalid') })),
    (req, res) => {
      res.json({ body: req.body });
    },
  );
  return createApp({ extraRoutes: extra, publicRoutes });
}

const cookie = (token: string) => `${AUTH_COOKIE_NAME}=${token}`;

// Konta w „bazie”: authenticate czyta osobę z tabeli users przy każdym żądaniu.
const USERS: Record<number, { id: number; name: string; role: string; must_change_password: number }> = {
  1: { id: 1, name: 'Anna', role: 'admin', must_change_password: 0 },
  2: { id: 2, name: 'Jan', role: 'employee', must_change_password: 0 },
  9: { id: 9, name: 'Ktoś', role: 'hacker', must_change_password: 0 },
};
beforeEach(() => {
  vi.mocked(pool.query).mockImplementation((async (_sql: string, params?: unknown[]) => {
    const user = USERS[Number(params?.[0])];
    return [user ? [user] : [], []];
  }) as never);
});

describe('health', () => {
  it('answers on /api/health', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('reports a database that does not answer', async () => {
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(createApp()).get('/api/health/db');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.message).toBe('server.db_down');
  });

  it('reports a working database', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce([[{ ok: 1 }], []] as never);
    const res = await request(createApp()).get('/api/health/db');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('behind a proxy (Caddy on the server)', () => {
  it('trusts one proxy so the login limit counts each visitor separately', () => {
    expect(createApp().get('trust proxy')).toBe(1);
  });
});

describe('unknown address', () => {
  it('returns 404 with a message key to a logged-in user', async () => {
    const token = signToken({ id: 2 }, 0);
    const res = await request(createApp()).get('/api/does-not-exist').set('Cookie', cookie(token));
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('server.not_found');
  });

  it('asks a logged-out visitor to log in instead of revealing what exists', async () => {
    const res = await request(createApp()).get('/api/does-not-exist');
    expect(res.status).toBe(401);
  });
});

describe('protected by default', () => {
  it('requires login on a route that forgot requireRole', async () => {
    const res = await request(appWithTestRoutes()).get('/api/test/forgotten');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('server.login_required');
  });

  it('lets any logged-in user through such a route', async () => {
    const token = signToken({ id: 2 }, 0);
    const res = await request(appWithTestRoutes()).get('/api/test/forgotten').set('Cookie', cookie(token));
    expect(res.status).toBe(200);
  });

  it('keeps routes from publicRoutes open to visitors', async () => {
    const res = await request(appWithTestRoutes()).post('/api/test/form').send({ email: 'anna@example.com' });
    expect(res.status).toBe(200);
  });
});

describe('mountModule', () => {
  function appWithModule(roles?: Parameters<typeof mountModule>[3]) {
    const moduleRoutes = express.Router();
    moduleRoutes.get('/', (_req, res) => {
      res.json({ ok: true });
    });
    const extra = express.Router();
    mountModule(extra, 'dashboard', moduleRoutes, roles);
    return createApp({ extraRoutes: extra });
  }

  it('takes the roles of the navigation item (dashboard: admin and employee)', async () => {
    const user = signToken({ id: 2 }, 0);
    const admin = signToken({ id: 1 }, 0);
    expect((await request(appWithModule()).get('/api/dashboard').set('Cookie', cookie(user))).status).toBe(200);
    expect((await request(appWithModule()).get('/api/dashboard').set('Cookie', cookie(admin))).status).toBe(200);
  });

  it('accepts explicit roles for a module without a navigation item', async () => {
    const user = signToken({ id: 2 }, 0);
    const res = await request(appWithModule(['admin'])).get('/api/dashboard').set('Cookie', cookie(user));
    expect(res.status).toBe(403);
  });

  it('refuses to start with a module that is not in the navigation and has no roles', () => {
    expect(() => mountModule(express.Router(), 'no-such-module', express.Router())).toThrow(/no-such-module/);
  });
});

describe('requireRole', () => {
  let app: express.Express;
  beforeAll(() => {
    app = appWithTestRoutes();
  });

  it('rejects a visitor without a cookie', async () => {
    const res = await request(app).get('/api/test/admin-only');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('server.login_required');
  });

  it('rejects a user with the wrong role', async () => {
    const token = signToken({ id: 2 }, 0);
    const res = await request(app).get('/api/test/admin-only').set('Cookie', cookie(token));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('server.no_access');
  });

  it('lets the right role in', async () => {
    const token = signToken({ id: 1 }, 0);
    const res = await request(app).get('/api/test/admin-only').set('Cookie', cookie(token));
    expect(res.status).toBe(200);
  });

  it('treats a token signed with another secret as logged out', async () => {
    const token = jwt.sign({ id: 1, ver: 0 }, 'another-secret');
    const res = await request(app).get('/api/test/admin-only').set('Cookie', cookie(token));
    expect(res.status).toBe(401);
  });

  it('treats an account with an unknown role in the database as logged out', async () => {
    const token = signToken({ id: 9 }, 0);
    const res = await request(app).get('/api/test/admin-only').set('Cookie', cookie(token));
    expect(res.status).toBe(401);
  });
});

describe('validateBody', () => {
  it('returns field keys for invalid data', async () => {
    const res = await request(appWithTestRoutes()).post('/api/test/form').send({ email: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('server.invalid_data');
    expect(res.body.error.fields.email).toBe('validation.email_invalid');
  });

  it('passes parsed data on', async () => {
    const res = await request(appWithTestRoutes())
      .post('/api/test/form')
      .send({ email: 'anna@example.com', extra: 'dropped' });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ email: 'anna@example.com' });
  });
});

describe('sameOrigin', () => {
  it('rejects a write sent from another site', async () => {
    const res = await request(appWithTestRoutes())
      .post('/api/test/form')
      .set('Origin', 'https://evil.example')
      .send({ email: 'jan@firma.pl' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('server.no_access');
  });

  it('accepts a write from the app itself and a request without Origin', async () => {
    const app = appWithTestRoutes();
    const own = await request(app).post('/api/test/form').set('Origin', new URL(env.FRONTEND_URL).origin).send({ email: 'jan@firma.pl' });
    expect(own.status).toBe(200);
    const noOrigin = await request(app).post('/api/test/form').send({ email: 'jan@firma.pl' });
    expect(noOrigin.status).toBe(200);
  });

  it('does not block reading from another site (CORS decides what the browser may read)', async () => {
    const res = await request(createApp()).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
  });
});

describe('JWT_SECRET', () => {
  it('stops the app when the secret is too short', () => {
    process.env.JWT_SECRET = 'short';
    try {
      expect(() => env.JWT_SECRET).toThrow(/za krótki/);
    } finally {
      process.env.JWT_SECRET = SECRET;
    }
  });

  it('rejects a token signed with another algorithm', () => {
    const forged = jwt.sign({ id: 1, ver: 0 }, SECRET, { algorithm: 'HS512' });
    return request(appWithTestRoutes()).get('/api/test/forgotten').set('Cookie', cookie(forged)).expect(401);
  });
});
