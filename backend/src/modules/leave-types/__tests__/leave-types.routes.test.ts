import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../leave-types.service', () => ({
  listTypes: vi.fn(),
  createType: vi.fn(),
  updateType: vi.fn(),
  moveType: vi.fn(),
  hideType: vi.fn(),
  unhideType: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../leave-types.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');
const { LEAVE_TYPE_MESSAGES: M } = await import('@app/shared');

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

const body = { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: '', color: 'teal', dayCount: 'calendar', requiresApproval: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.updateType).mockResolvedValue({ ok: true });
  vi.mocked(s.moveType).mockResolvedValue({ ok: true });
  vi.mocked(s.hideType).mockResolvedValue({ ok: true });
  vi.mocked(s.unhideType).mockResolvedValue({ ok: true });
});

describe('leave types routes', () => {
  it('GET /leave-types without login → 401', async () => {
    expect((await as(null).get('/leave-types')).status).toBe(401);
  });

  it('GET /leave-types as employee → 403', async () => {
    expect((await as(jan).get('/leave-types')).status).toBe(403);
    expect((await as(jan).post('/leave-types', body)).status).toBe(403);
  });

  it('GET /leave-types → items in order', async () => {
    const items = [{ id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, color: 'green' as const, dayCount: 'working' as const, requiresApproval: true, hidden: false, requestsCount: 0 }];
    vi.mocked(s.listTypes).mockResolvedValue({ items });
    const res = await as(anna).get('/leave-types');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items });
  });

  it('POST /leave-types → 201 with id, data after the schema; bad data → 400', async () => {
    vi.mocked(s.createType).mockResolvedValue({ id: 6 });
    const res = await as(anna).post('/leave-types', { ...body, name: ' Szkoleniowy ', position: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 6 });
    expect(s.createType).toHaveBeenCalledWith({ name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'calendar', requiresApproval: false }, { id: 1, name: 'Anna Nowak' });

    const bad = await as(anna).post('/leave-types', { name: 'S', deductsPool: true, yearlyLimit: 0, color: 'green', dayCount: 'working', requiresApproval: true });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toEqual({ name: 'validation.too_short', yearlyLimit: 'validation.min' });
  });

  it('POST /leave-types with taken name → 409 with fields.name and hiddenType', async () => {
    vi.mocked(s.createType).mockResolvedValue({
      error: { status: 409, message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Szkoleniowy' } },
    });
    const res = await as(anna).post('/leave-types', body);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ message: M.nameTakenHidden, fields: { name: M.nameTakenHidden }, hiddenType: { id: 7, name: 'Szkoleniowy' } });
  });

  it('PUT /leave-types/:id with a color outside the list → 400 with fields.color, service not called', async () => {
    const res = await as(anna).put('/leave-types/3', { ...body, color: 'red' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ color: 'validation.invalid_option' });
    expect(s.updateType).not.toHaveBeenCalled();
  });

  it('PUT /leave-types/:id → ok; missing → 404; bad id → 404', async () => {
    const res = await as(anna).put('/leave-types/3', body);
    expect(res.status).toBe(200);
    expect(s.updateType).toHaveBeenCalledWith(3, { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'calendar', requiresApproval: false }, { id: 1, name: 'Anna Nowak' });
    vi.mocked(s.updateType).mockResolvedValueOnce({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(anna).put('/leave-types/99', body)).status).toBe(404);
    expect((await as(anna).put('/leave-types/abc', body)).status).toBe(404);
  });

  it('POST /leave-types/:id/move → ok; bad direction → 400; bad id → 404', async () => {
    expect((await as(anna).post('/leave-types/3/move', { direction: 'up' })).status).toBe(200);
    expect(s.moveType).toHaveBeenCalledWith(3, 'up');
    expect((await as(anna).post('/leave-types/3/move', { direction: 'left' })).status).toBe(400);
    expect((await as(anna).post('/leave-types/x/move', { direction: 'down' })).status).toBe(404);
    expect((await as(jan).post('/leave-types/3/move', { direction: 'up' })).status).toBe(403);
  });

  it('POST /leave-types/:id/hide and /unhide → ok and 409 rules', async () => {
    expect((await as(anna).post('/leave-types/3/hide')).status).toBe(200);
    expect(s.hideType).toHaveBeenCalledWith(3, { id: 1, name: 'Anna Nowak' });
    vi.mocked(s.hideType).mockResolvedValueOnce({ error: { status: 409, message: M.lastVisible } });
    const last = await as(anna).post('/leave-types/3/hide');
    expect(last.status).toBe(409);
    expect(last.body.error.message).toBe(M.lastVisible);
    expect((await as(anna).post('/leave-types/3/unhide')).status).toBe(200);
    expect(s.unhideType).toHaveBeenCalledWith(3, { id: 1, name: 'Anna Nowak' });
    vi.mocked(s.unhideType).mockResolvedValueOnce({ error: { status: 409, message: M.notHidden } });
    expect((await as(anna).post('/leave-types/3/unhide')).status).toBe(409);
    expect((await as(jan).post('/leave-types/3/hide')).status).toBe(403);
  });
});

describe('abuse', () => {
  it('employee gets 403 on every leave types route, and nothing is called', async () => {
    const e = as(jan);
    const responses = await Promise.all([
      e.get('/leave-types'),
      e.post('/leave-types', body),
      e.put('/leave-types/1', body),
      e.post('/leave-types/1/move', { direction: 'up' }),
      e.post('/leave-types/1/hide'),
      e.post('/leave-types/1/unhide'),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
    for (const fn of [s.listTypes, s.createType, s.updateType, s.moveType, s.hideType, s.unhideType]) expect(fn).not.toHaveBeenCalled();
  });

  it('forged fields (id, position, hidden, requestsCount) are dropped before the service', async () => {
    vi.mocked(s.createType).mockResolvedValue({ id: 6 });
    const forged = { ...body, id: 1, position: 1, hidden: true, hiddenAt: '2020-01-01', requestsCount: 99 };
    await as(anna).post('/leave-types', forged);
    expect(s.createType).toHaveBeenCalledWith({ name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'calendar', requiresApproval: false }, { id: 1, name: 'Anna Nowak' });
    await as(anna).put('/leave-types/3', forged);
    expect(s.updateType).toHaveBeenCalledWith(3, { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: null, color: 'teal', dayCount: 'calendar', requiresApproval: false }, { id: 1, name: 'Anna Nowak' });
    await as(anna).post('/leave-types/3/move', { direction: 'up', position: 1 });
    expect(s.moveType).toHaveBeenCalledWith(3, 'up');
  });

  it('bad data → 400 with field keys: too long, negative, huge, text, wrong boolean', async () => {
    const cases: [object, string][] = [
      [{ ...body, name: 'a'.repeat(41) }, 'name'],
      [{ ...body, yearlyLimit: -5 }, 'yearlyLimit'],
      [{ ...body, yearlyLimit: 99999999 }, 'yearlyLimit'],
      [{ ...body, yearlyLimit: 'abc' }, 'yearlyLimit'],
      [{ ...body, deductsPool: 'yes' }, 'deductsPool'],
      [{ ...body, color: 'yellow' }, 'color'],
      [{ ...body, color: 'var(--mantine-color-red-8)' }, 'color'],
      [{ name: 'Szkoleniowy', deductsPool: true }, 'color'],
      [{ ...body, dayCount: 'hours' }, 'dayCount'],
      [{ ...body, dayCount: undefined }, 'dayCount'],
      [{ ...body, requiresApproval: 'nie' }, 'requiresApproval'],
      [{ ...body, requiresApproval: undefined }, 'requiresApproval'],
    ];
    for (const [data, field] of cases) {
      const res = await as(anna).post('/leave-types', data);
      expect(res.status).toBe(400);
      expect(res.body.error.fields[field]).toBeDefined();
    }
    expect(s.createType).not.toHaveBeenCalled();
  });

  it('abuse: color with CSS or a status color (it goes into the calendar style) → 400, service not called', async () => {
    for (const color of ['green; background: url(https://zly.example/x.png)', 'var(--mantine-color-red-8)', 'GREEN', 'yellow', ' green']) {
      const r = await as(anna).put('/leave-types/3', { ...body, color });
      expect(r.status).toBe(400);
      expect(r.body.error.fields.color).toBe('validation.invalid_option');
    }
    expect(s.updateType).not.toHaveBeenCalled();
  });

  it('ids that are not positive whole numbers → 404 on every route with an id', async () => {
    const a = as(anna);
    for (const id of ['0', '-1', '1.5', '1e3', 'abc']) {
      expect((await a.put(`/leave-types/${id}`, body)).status).toBe(404);
      expect((await a.post(`/leave-types/${id}/move`, { direction: 'up' })).status).toBe(404);
      expect((await a.post(`/leave-types/${id}/hide`)).status).toBe(404);
      expect((await a.post(`/leave-types/${id}/unhide`)).status).toBe(404);
    }
  });
});
