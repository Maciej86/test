import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({
  findActiveUserById: vi.fn(),
  findActiveUserByLogin: vi.fn(),
  findPasswordHash: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock('../../../auth/password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../auth/password')>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const queries = await import('../../../auth/users.queries');
const password = await import('../../../auth/password');
const { createApp } = await import('../../../app');
const { signToken, verifyToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const temporary: SessionUser = { ...jan, mustChangePassword: true };
let janHash = '';
const cookieFor = (user: SessionUser) => `${AUTH_COOKIE_NAME}=${signToken(user, 0)}`;

beforeAll(async () => {
  janHash = await password.hashPassword('Urlop-2026');
});

beforeEach(() => {
  vi.mocked(queries.findActiveUserByLogin).mockReset();
  vi.mocked(queries.findActiveUserById).mockReset();
  vi.mocked(queries.findPasswordHash).mockReset();
  vi.mocked(queries.updatePassword).mockReset();
  vi.mocked(password.verifyPassword).mockClear();
});

function tokenFrom(res: { headers: Record<string, unknown> }) {
  const header = (res.headers['set-cookie'] as string[] | undefined)?.[0] ?? '';
  return verifyToken(header.slice(`${AUTH_COOKIE_NAME}=`.length).split(';')[0]!);
}

describe('password change ends other sessions (token_version)', () => {
  it('POST /auth/login puts the account token version into the cookie', async () => {
    vi.mocked(queries.findActiveUserByLogin).mockResolvedValue({ user: jan, passwordHash: janHash, tokenVersion: 5 });
    const res = await request(createApp()).post('/api/auth/login').send({ login: 'jan.kowalski@firma.pl', password: 'Urlop-2026' });
    expect(res.status).toBe(200);
    expect(tokenFrom(res)).toMatchObject({ id: 2, tokenVersion: 5 });
  });

  it('authenticate looks the account up together with the token version', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(jan);
    await request(createApp()).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE_NAME}=${signToken(jan, 4)}`);
    expect(queries.findActiveUserById).toHaveBeenCalledWith(2, 4);
  });

  it('an old token whose version no longer matches is logged out (401)', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(null);
    const res = await request(createApp()).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE_NAME}=${signToken(jan, 0)}`);
    expect(res.status).toBe(401);
  });

  it('POST /auth/change-password gives the person a new cookie with the raised version', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    vi.mocked(queries.findPasswordHash).mockResolvedValue(janHash);
    vi.mocked(queries.updatePassword).mockResolvedValue(1);
    const res = await request(createApp())
      .post('/api/auth/change-password')
      .set('Cookie', cookieFor(temporary))
      .send({ newPassword: 'Nowe-2026!', repeatPassword: 'Nowe-2026!' });
    expect(res.status).toBe(200);
    expect(tokenFrom(res)).toMatchObject({ id: 2, tokenVersion: 1 });
  });
});

describe('auth routes', () => {
  it('POST /auth/login with good data returns the user without password_hash and sets the cookie', async () => {
    vi.mocked(queries.findActiveUserByLogin).mockResolvedValue({ user: jan, passwordHash: janHash, tokenVersion: 0 });
    const res = await request(createApp()).post('/api/auth/login').send({ login: 'jan.kowalski@firma.pl', password: 'Urlop-2026' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: jan });
    expect(JSON.stringify(res.body)).not.toContain('$2');
    expect(res.headers['set-cookie']?.[0]).toContain(`${AUTH_COOKIE_NAME}=`);
  });

  it('POST /auth/login with a wrong password returns 401 login_failed', async () => {
    vi.mocked(queries.findActiveUserByLogin).mockResolvedValue({ user: jan, passwordHash: janHash, tokenVersion: 0 });
    const res = await request(createApp()).post('/api/auth/login').send({ login: 'jan.kowalski@firma.pl', password: 'zle' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('server.login_failed');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('POST /auth/login with an unknown login compares against the dummy hash and returns 401 login_failed', async () => {
    vi.mocked(queries.findActiveUserByLogin).mockResolvedValue(null);
    const res = await request(createApp()).post('/api/auth/login').send({ login: 'nikt@firma.pl', password: 'Urlop-2026' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('server.login_failed');
    expect(password.verifyPassword).toHaveBeenCalledWith('Urlop-2026', await password.dummyPasswordHash());
  });

  it('POST /auth/login looks the login up in lower case', async () => {
    vi.mocked(queries.findActiveUserByLogin).mockResolvedValue({ user: jan, passwordHash: janHash, tokenVersion: 0 });
    await request(createApp()).post('/api/auth/login').send({ login: ' JAN.KOWALSKI@FIRMA.PL ', password: 'Urlop-2026' });
    expect(queries.findActiveUserByLogin).toHaveBeenCalledWith('jan.kowalski@firma.pl');
  });

  it('POST /auth/login with empty fields returns 400 with field keys', async () => {
    const res = await request(createApp()).post('/api/auth/login').send({ login: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ login: 'validation.required', password: 'validation.required' });
  });

  it('POST /auth/logout clears the cookie', async () => {
    const res = await request(createApp()).post('/api/auth/logout');
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']?.[0]).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=;`));
  });

  it('GET /auth/me without login returns 401', async () => {
    const res = await request(createApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the logged-in user with mustChangePassword', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    const res = await request(createApp()).get('/api/auth/me').set('Cookie', cookieFor(temporary));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: temporary });
  });

  it('a temporary password does not block /auth/me with 403 password_change_required', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    const res = await request(createApp()).get('/api/auth/me').set('Cookie', cookieFor(temporary));
    expect(res.status).not.toBe(403);
  });

  it('POST /auth/change-password without a temporary password returns 409', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(jan);
    const res = await request(createApp())
      .post('/api/auth/change-password')
      .set('Cookie', cookieFor(jan))
      .send({ newPassword: 'Nowe-2026', repeatPassword: 'Nowe-2026' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('server.password_not_temporary');
    expect(queries.updatePassword).not.toHaveBeenCalled();
  });

  it('POST /auth/change-password with the same password returns 400 password_same_as_temporary', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    vi.mocked(queries.findPasswordHash).mockResolvedValue(janHash);
    const res = await request(createApp())
      .post('/api/auth/change-password')
      .set('Cookie', cookieFor(temporary))
      .send({ newPassword: 'Urlop-2026', repeatPassword: 'Urlop-2026' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ newPassword: 'validation.password_same_as_temporary' });
    expect(queries.updatePassword).not.toHaveBeenCalled();
  });

  it('POST /auth/change-password saves the new password and clears the flag', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    vi.mocked(queries.findPasswordHash).mockResolvedValue(janHash);
    const res = await request(createApp())
      .post('/api/auth/change-password')
      .set('Cookie', cookieFor(temporary))
      .send({ newPassword: ' Zażółć-1 ', repeatPassword: ' Zażółć-1 ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: jan });
    const [id, hash] = vi.mocked(queries.updatePassword).mock.calls[0]!;
    expect(id).toBe(2);
    expect(await password.verifyPassword(' Zażółć-1 ', hash)).toBe(true);
  });

  it('POST /auth/change-password with different passwords returns 400', async () => {
    vi.mocked(queries.findActiveUserById).mockResolvedValue(temporary);
    const res = await request(createApp())
      .post('/api/auth/change-password')
      .set('Cookie', cookieFor(temporary))
      .send({ newPassword: 'Nowe-2026', repeatPassword: 'Nowe-2025' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ repeatPassword: 'validation.passwords_differ' });
  });
});
