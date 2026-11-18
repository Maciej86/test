import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../projects.service', () => ({
  listProjects: vi.fn(),
  listCandidates: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  moveProject: vi.fn(),
  deleteProject: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../projects.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 5, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
    put: (url: string, body?: object) => request(app).put(`/api${url}`).set('Cookie', cookie).send(body),
    delete: (url: string, body?: object) => request(app).delete(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

const body = { name: 'Marketing', memberIds: [5, 6] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.listProjects).mockResolvedValue({ items: [] });
  vi.mocked(s.listCandidates).mockResolvedValue([]);
  vi.mocked(s.createProject).mockResolvedValue({ id: 9 });
  vi.mocked(s.updateProject).mockResolvedValue({ ok: true });
  vi.mocked(s.moveProject).mockResolvedValue({ ok: true });
  vi.mocked(s.deleteProject).mockResolvedValue({ ok: true, deletedTasks: 4 });
});

describe('projects routes', () => {
  it('401 without login', async () => {
    expect((await as(null).get('/tasks/projects')).status).toBe(401);
  });

  it('403 for an employee on admin-only routes', async () => {
    const me = as(jan);
    expect((await me.get('/tasks/projects/candidates')).status).toBe(403);
    expect((await me.post('/tasks/projects', body)).status).toBe(403);
    expect((await me.put('/tasks/projects/9', body)).status).toBe(403);
    expect((await me.post('/tasks/projects/9/move', { direction: 'up' })).status).toBe(403);
    expect((await me.delete('/tasks/projects/9', { confirmName: 'Marketing' })).status).toBe(403);
    expect(s.createProject).not.toHaveBeenCalled();
  });

  it('GET /projects: the service gets the viewer from the session (admin all, employee own)', async () => {
    expect((await as(jan).get('/tasks/projects')).status).toBe(200);
    expect(s.listProjects).toHaveBeenCalledWith({ id: 5, name: 'Jan Kowalski', role: 'employee' });
  });

  it('POST /projects 201, 400 fields, 409 name taken', async () => {
    const res = await as(anna).post('/tasks/projects', body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 9 });
    expect(s.createProject).toHaveBeenCalledWith(body, { id: 1, name: 'Anna Nowak' });
    const bad = await as(anna).post('/tasks/projects', { name: 'a', memberIds: [5, 5] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields).toEqual({ name: 'validation.too_short', memberIds: 'validation.duplicates' });
    vi.mocked(s.createProject).mockResolvedValue({ error: { status: 409, message: 'tasks.project_name_taken', fields: { name: 'tasks.project_name_taken' } } });
    expect((await as(anna).post('/tasks/projects', body)).status).toBe(409);
  });

  it('PUT, move and candidates pass the id and the input', async () => {
    expect((await as(anna).put('/tasks/projects/9', body)).status).toBe(200);
    expect(s.updateProject).toHaveBeenCalledWith(9, body, { id: 1, name: 'Anna Nowak' });
    expect((await as(anna).post('/tasks/projects/9/move', { direction: 'down' })).status).toBe(200);
    expect(s.moveProject).toHaveBeenCalledWith(9, 'down');
    expect((await as(anna).post('/tasks/projects/9/move', { direction: 'left' })).status).toBe(400);
    expect((await as(anna).get('/tasks/projects/candidates')).status).toBe(200);
  });

  it('DELETE /projects/:id passes the typed name, empty name → 400', async () => {
    const res = await as(anna).delete('/tasks/projects/9', { confirmName: 'Marketing' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, deletedTasks: 4 });
    expect(s.deleteProject).toHaveBeenCalledWith(9, 'Marketing', { id: 1, name: 'Anna Nowak' });
    expect((await as(anna).delete('/tasks/projects/9', { confirmName: '' })).status).toBe(400);
  });
});

describe('abuse', () => {
  it('forged ids in the address give 404 without calling the service', async () => {
    for (const id of ['0', '-1', '1e3', '0x10', '007', 'abc', '21;DROP']) {
      const at = `/tasks/projects/${encodeURIComponent(id)}`;
      expect((await as(anna).put(at, body)).status).toBe(404);
      expect((await as(anna).post(`${at}/move`, { direction: 'up' })).status).toBe(404);
      expect((await as(anna).delete(at, { confirmName: 'Marketing' })).status).toBe(404);
    }
    expect(s.updateProject).not.toHaveBeenCalled();
    expect(s.moveProject).not.toHaveBeenCalled();
    expect(s.deleteProject).not.toHaveBeenCalled();
  });

  it('an employee cannot pass a different user or role in the body', async () => {
    await as(jan).get('/tasks/projects');
    expect(s.listProjects).toHaveBeenCalledWith(expect.objectContaining({ role: 'employee' }));
  });
});
