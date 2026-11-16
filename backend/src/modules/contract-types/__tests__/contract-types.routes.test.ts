import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../contract-types.service', () => ({
  listTypes: vi.fn(),
  createType: vi.fn(),
  updateType: vi.fn(),
  moveType: vi.fn(),
  hideType: vi.fn(),
  unhideType: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../contract-types.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');
const { CONTRACT_TYPE_MESSAGES: M } = await import('@app/shared');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

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

const body = { name: 'Umowa o staż' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.updateType).mockResolvedValue({ ok: true });
  vi.mocked(s.moveType).mockResolvedValue({ ok: true });
  vi.mocked(s.hideType).mockResolvedValue({ ok: true });
  vi.mocked(s.unhideType).mockResolvedValue({ ok: true });
});

describe('contract types routes', () => {
  it('GET /contract-types without login → 401', async () => {
    expect((await as(null).get('/contract-types')).status).toBe(401);
  });

  it('GET /contract-types as employee → 403', async () => {
    expect((await as(jan).get('/contract-types')).status).toBe(403);
    expect((await as(jan).post('/contract-types', body)).status).toBe(403);
  });

  it('GET /contract-types → items in order', async () => {
    const items = [{ id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 }];
    vi.mocked(s.listTypes).mockResolvedValue({ items });
    const res = await as(anna).get('/contract-types');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items });
  });

  it('POST /contract-types → 201 with id, data after the schema; bad data → 400', async () => {
    vi.mocked(s.createType).mockResolvedValue({ id: 6 });
    const res = await as(anna).post('/contract-types', { name: ' Umowa o staż ', position: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 6 });
    expect(s.createType).toHaveBeenCalledWith({ name: 'Umowa o staż' });

    const bad = await as(anna).post('/contract-types', { name: 'U' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toEqual({ name: 'validation.too_short' });
  });

  it('POST /contract-types with taken name → 409 with fields.name and hiddenType', async () => {
    vi.mocked(s.createType).mockResolvedValue({
      error: { status: 409, message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Umowa o staż' } },
    });
    const res = await as(anna).post('/contract-types', body);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Umowa o staż' } });
  });

  it('PUT /contract-types/:id → ok; missing → 404; bad id → 404', async () => {
    const res = await as(anna).put('/contract-types/3', body);
    expect(res.status).toBe(200);
    expect(s.updateType).toHaveBeenCalledWith(3, { name: 'Umowa o staż' });
    vi.mocked(s.updateType).mockResolvedValueOnce({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(anna).put('/contract-types/99', body)).status).toBe(404);
    expect((await as(anna).put('/contract-types/abc', body)).status).toBe(404);
  });

  it('POST /contract-types/:id/move → ok; bad direction → 400; bad id → 404', async () => {
    expect((await as(anna).post('/contract-types/3/move', { direction: 'up' })).status).toBe(200);
    expect(s.moveType).toHaveBeenCalledWith(3, 'up');
    expect((await as(anna).post('/contract-types/3/move', { direction: 'left' })).status).toBe(400);
    expect((await as(anna).post('/contract-types/x/move', { direction: 'down' })).status).toBe(404);
    expect((await as(jan).post('/contract-types/3/move', { direction: 'up' })).status).toBe(403);
  });

  it('POST /contract-types/:id/hide and /unhide → ok and 409 rules', async () => {
    expect((await as(anna).post('/contract-types/3/hide')).status).toBe(200);
    expect(s.hideType).toHaveBeenCalledWith(3);
    vi.mocked(s.hideType).mockResolvedValueOnce({ error: { status: 409, message: M.alreadyHidden } });
    const again = await as(anna).post('/contract-types/3/hide');
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe(M.alreadyHidden);
    expect((await as(anna).post('/contract-types/3/unhide')).status).toBe(200);
    expect(s.unhideType).toHaveBeenCalledWith(3);
    vi.mocked(s.unhideType).mockResolvedValueOnce({ error: { status: 409, message: M.notHidden } });
    expect((await as(anna).post('/contract-types/3/unhide')).status).toBe(409);
    expect((await as(jan).post('/contract-types/3/hide')).status).toBe(403);
  });
});

describe('abuse', () => {
  it('employee gets 403 on every contract types route, and nothing is called', async () => {
    const e = as(jan);
    const responses = await Promise.all([
      e.get('/contract-types'),
      e.post('/contract-types', body),
      e.put('/contract-types/1', body),
      e.post('/contract-types/1/move', { direction: 'up' }),
      e.post('/contract-types/1/hide'),
      e.post('/contract-types/1/unhide'),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
    for (const fn of [s.listTypes, s.createType, s.updateType, s.moveType, s.hideType, s.unhideType]) expect(fn).not.toHaveBeenCalled();
  });

  it('forged fields (id, position, hidden, employeesCount) are dropped before the service', async () => {
    vi.mocked(s.createType).mockResolvedValue({ id: 6 });
    const forged = { ...body, id: 1, position: 1, hidden: true, hiddenAt: '2020-01-01', employeesCount: 99 };
    await as(anna).post('/contract-types', forged);
    expect(s.createType).toHaveBeenCalledWith({ name: 'Umowa o staż' });
    await as(anna).put('/contract-types/3', forged);
    expect(s.updateType).toHaveBeenCalledWith(3, { name: 'Umowa o staż' });
    await as(anna).post('/contract-types/3/move', { direction: 'up', position: 1 });
    expect(s.moveType).toHaveBeenCalledWith(3, 'up');
  });

  it('bad data → 400 with field keys: too long, number, empty, missing', async () => {
    for (const data of [{ name: 'a'.repeat(61) }, { name: 12345 }, { name: '  ' }, {}]) {
      const res = await as(anna).post('/contract-types', data);
      expect(res.status).toBe(400);
      expect(res.body.error.fields.name).toBeDefined();
    }
    expect(s.createType).not.toHaveBeenCalled();
  });

  it('ids that are not positive whole numbers → 404 on every route with an id', async () => {
    const a = as(anna);
    for (const id of ['0', '-1', '1.5', '1e3', 'abc']) {
      expect((await a.put(`/contract-types/${id}`, body)).status).toBe(404);
      expect((await a.post(`/contract-types/${id}/move`, { direction: 'up' })).status).toBe(404);
      expect((await a.post(`/contract-types/${id}/hide`)).status).toBe(404);
      expect((await a.post(`/contract-types/${id}/unhide`)).status).toBe(404);
    }
  });
});
