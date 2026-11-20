import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../my-account.service', () => ({ getMyAccount: vi.fn(), updateMyEmail: vi.fn(), changeMyPassword: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../my-account.service');
const { createApp } = await import('../../../app');
const { signToken, verifyToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const account = { name: 'Jan Kowalski', login: 'jan@firma.pl', role: 'employee', email: null, hiredOn: null, contractTypeName: null };
const password = { currentPassword: 'Stare-haslo1', newPassword: 'Urlop2026!', repeatPassword: 'Urlop2026!' };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
    put: (url: string, body?: object) => request(app).put(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getMyAccount).mockResolvedValue(account as never);
  vi.mocked(s.updateMyEmail).mockImplementation(async (_actor, email) => ({ email }));
  vi.mocked(s.changeMyPassword).mockResolvedValue({ tokenVersion: 4 });
});

describe('my account routes', () => {
  it('GET /my-account without login → 401', async () => {
    expect((await as(null).get('/my-account')).status).toBe(401);
    expect((await as(null).put('/my-account/email', { email: null })).status).toBe(401);
    expect((await as(null).post('/my-account/password', password)).status).toBe(401);
  });

  it('GET /my-account with a temporary password → 403', async () => {
    const r = await as({ ...jan, mustChangePassword: true }).get('/my-account');
    expect(r.status).toBe(403);
    expect(s.getMyAccount).not.toHaveBeenCalled();
  });

  it('GET /my-account → own data of req.user (admin and employee)', async () => {
    const r = await as(jan).get('/my-account');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(account);
    expect(s.getMyAccount).toHaveBeenCalledWith(2);
    expect((await as(anna).get('/my-account')).status).toBe(200);
    expect(s.getMyAccount).toHaveBeenLastCalledWith(1);
  });

  it('PUT /my-account/email → saves for req.user; empty → null', async () => {
    const r = await as(jan).put('/my-account/email', { email: ' Jan.K@Firma.pl ' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ email: 'jan.k@firma.pl' });
    expect(s.updateMyEmail).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski' }, 'jan.k@firma.pl');
    await as(jan).put('/my-account/email', { email: '' });
    expect(s.updateMyEmail).toHaveBeenLastCalledWith({ id: 2, name: 'Jan Kowalski' }, null);
  });

  it('PUT /my-account/email with a bad format or 191 characters → 400', async () => {
    expect((await as(jan).put('/my-account/email', { email: 'jan@' })).body.error.fields).toEqual({ email: 'validation.email_invalid' });
    const long = `${'a'.repeat(182)}@firma.pl`;
    expect((await as(jan).put('/my-account/email', { email: long })).status).toBe(400);
    expect(s.updateMyEmail).not.toHaveBeenCalled();
  });

  it('PUT /my-account/email taken → 409 under the field', async () => {
    vi.mocked(s.updateMyEmail).mockResolvedValue({ error: { status: 409, message: 'validation.email_taken', fields: { email: 'validation.email_taken' } } });
    const r = await as(jan).put('/my-account/email', { email: 'ewa@firma.pl' });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ email: 'validation.email_taken' });
  });

  it('POST /my-account/password → ok and a new session cookie with the new version', async () => {
    const r = await as(jan).post('/my-account/password', password);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(s.changeMyPassword).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski' }, password);
    const cookie = String(r.headers['set-cookie']).match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))![1]!;
    expect(verifyToken(cookie)).toMatchObject({ id: 2, tokenVersion: 4 });
  });

  it('POST /my-account/password wrong current → 400 under currentPassword, no cookie', async () => {
    vi.mocked(s.changeMyPassword).mockResolvedValue({ error: { status: 400, message: 'server.invalid_data', fields: { currentPassword: 'my-account.server.current_wrong' } } });
    const r = await as(jan).post('/my-account/password', password);
    expect(r.status).toBe(400);
    expect(r.body.error.fields).toEqual({ currentPassword: 'my-account.server.current_wrong' });
    expect(r.headers['set-cookie']).toBeUndefined();
  });

  it('POST /my-account/password different repeat or breaking the rules → 400 before the service', async () => {
    expect((await as(jan).post('/my-account/password', { ...password, repeatPassword: 'Urlop2025!' })).body.error.fields).toEqual({ repeatPassword: 'validation.passwords_differ' });
    expect((await as(jan).post('/my-account/password', { ...password, newPassword: 'krotkie', repeatPassword: 'krotkie' })).status).toBe(400);
    expect(s.changeMyPassword).not.toHaveBeenCalled();
  });
});

describe('abuse', () => {
  it('an account number in the address → 404 (there is no "someone else\'s account" route)', async () => {
    expect((await as(jan).get('/my-account/1')).status).toBe(404);
    expect((await as(jan).put('/my-account/1/email', { email: null })).status).toBe(404);
    expect((await as(jan).post('/my-account/1/password', password)).status).toBe(404);
  });

  it('forged fields (role, name, login, password hash) are dropped; only the e-mail goes to the service', async () => {
    await as(jan).put('/my-account/email', { email: 'jan@firma.pl', role: 'admin', name: 'Szef', login: 'szef@firma.pl', password_hash: 'x' });
    expect(s.updateMyEmail).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski' }, 'jan@firma.pl');
  });

  it('<script> as the e-mail → 400 under the field', async () => {
    const r = await as(jan).put('/my-account/email', { email: '<script>alert(1)</script>' });
    expect(r.status).toBe(400);
    expect(r.body.error.fields).toEqual({ email: 'validation.email_invalid' });
  });

  it('an account id in the body is ignored: only req.user changes', async () => {
    await as(jan).put('/my-account/email', { email: 'jan@firma.pl', id: 1, userId: 1 });
    expect(s.updateMyEmail).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski' }, 'jan@firma.pl');
    await as(jan).post('/my-account/password', { ...password, id: 1 });
    expect(s.changeMyPassword).toHaveBeenCalledWith({ id: 2, name: 'Jan Kowalski' }, password);
  });

  it('the old session of another device → 401 after the change (token version)', async () => {
    // authenticate szuka konta z wersją z tokenu; po zmianie hasła stara wersja nie pasuje (findActiveUserById → null).
    vi.mocked(users.findActiveUserById).mockImplementation(async (_id, version) => (version === 4 ? jan : null));
    const app = createApp();
    const old = await request(app).get('/api/my-account').set('Cookie', `${AUTH_COOKIE_NAME}=${signToken(jan, 3)}`);
    const fresh = await request(app).get('/api/my-account').set('Cookie', `${AUTH_COOKIE_NAME}=${signToken(jan, 4)}`);
    expect([old.status, fresh.status]).toEqual([401, 200]);
  });
});
