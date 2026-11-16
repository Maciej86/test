// Osobny plik: licznik limitu logowań jest wspólny dla wszystkich testów w jednym pliku.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../../auth/users.queries', () => ({
  findActiveUserById: vi.fn(),
  findActiveUserByLogin: vi.fn(),
  findPasswordHash: vi.fn(),
  updatePassword: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const queries = await import('../../auth/users.queries');
const { hashPassword } = await import('../../auth/password');
const { createApp } = await import('../../app');

const jan = { id: 2, name: 'Jan Kowalski', role: 'employee' as const, mustChangePassword: false };

beforeAll(async () => {
  const passwordHash = await hashPassword('Urlop-2026');
  vi.mocked(queries.findActiveUserByLogin).mockResolvedValue({ user: jan, passwordHash, tokenVersion: 0 });
});

describe('login rate limit', () => {
  it('11th failed login in 15 minutes returns 429 too_many_logins', async () => {
    const app = createApp();
    const login = (password: string) =>
      request(app).post('/api/auth/login').set('X-Forwarded-For', '10.0.0.1').send({ login: 'jan.kowalski@firma.pl', password });
    for (let i = 0; i < 10; i++) expect((await login('zle')).status).toBe(401);
    const blocked = await login('zle');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toBe('server.too_many_logins');
  }, 30_000);

  it('successful logins do not use up the limit', async () => {
    const app = createApp();
    const login = (password: string) =>
      request(app).post('/api/auth/login').set('X-Forwarded-For', '10.0.0.2').send({ login: 'jan.kowalski@firma.pl', password });
    for (let i = 0; i < 12; i++) expect((await login('Urlop-2026')).status).toBe(200);
    expect((await login('zle')).status).toBe(401);
  }, 30_000);
});
