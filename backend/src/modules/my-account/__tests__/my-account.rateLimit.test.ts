// Osobny plik: licznik limitu prób jest wspólny dla wszystkich testów w jednym pliku.
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../my-account.service', () => ({ getMyAccount: vi.fn(), updateMyEmail: vi.fn(), changeMyPassword: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../my-account.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const person = (id: number): SessionUser => ({ id, name: `Osoba ${id}`, role: 'employee', mustChangePassword: false });
const body = { currentPassword: 'Stare-haslo1', newPassword: 'Urlop2026!', repeatPassword: 'Urlop2026!' };
const wrong = { error: { status: 400, message: 'server.invalid_data', fields: { currentPassword: 'my-account.server.current_wrong' } } };

const attempt = (app: ReturnType<typeof createApp>, user: SessionUser) =>
  request(app).post('/api/my-account/password').set('Cookie', `${AUTH_COOKIE_NAME}=${signToken(user, 0)}`).set('X-Forwarded-For', '10.0.0.9').send(body);

describe('password change rate limit', () => {
  it('11th failed try in 15 minutes → 429; the limit counts per account, not per IP address', async () => {
    vi.mocked(users.findActiveUserById).mockImplementation(async (id) => person(id));
    vi.mocked(s.changeMyPassword).mockResolvedValue(wrong);
    const app = createApp();
    for (let i = 0; i < 10; i++) expect((await attempt(app, person(31))).status).toBe(400);
    const blocked = await attempt(app, person(31));
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toBe('server.too_many_password_tries');
    // Ta sama sieć (adres IP), inne konto: bez blokady.
    expect((await attempt(app, person(32))).status).toBe(400);
  }, 30_000);

  it('successful changes do not use up the limit', async () => {
    vi.mocked(users.findActiveUserById).mockImplementation(async (id) => person(id));
    vi.mocked(s.changeMyPassword).mockResolvedValue({ tokenVersion: 1 });
    const app = createApp();
    for (let i = 0; i < 12; i++) expect((await attempt(app, person(33))).status).toBe(200);
  }, 30_000);
});
