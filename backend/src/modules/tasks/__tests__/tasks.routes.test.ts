import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../tasks.service', () => ({ getBoard: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), moveTask: vi.fn(), archiveTask: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../tasks.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const jan: SessionUser = { id: 5, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const viewer = { id: 5, name: 'Jan Kowalski', role: 'employee' };

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

const task = { title: 'Zamówić ulotki', description: '', dueDate: '', column: 'draft', assigneeIds: [6] };
const yesterday = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.createTask).mockResolvedValue({ id: 40 });
  vi.mocked(s.updateTask).mockResolvedValue({ ok: true });
  vi.mocked(s.moveTask).mockResolvedValue({ ok: true });
  vi.mocked(s.archiveTask).mockResolvedValue({ ok: true });
});

describe('tasks routes', () => {
  it('401 without login, 403 for an employee on the admin-only project routes', async () => {
    expect((await as(null).post('/tasks/projects/9/tasks', task)).status).toBe(401);
    expect((await as(null).post('/tasks/40/move', { column: 'done', beforeTaskId: null })).status).toBe(401);
    expect((await as(jan).post('/tasks/projects', { name: 'Marketing', memberIds: [] })).status).toBe(403);
  });

  it('POST task 201 with the viewer from the session; 400 for a due date in the past', async () => {
    const res = await as(jan).post('/tasks/projects/9/tasks', { ...task, createdBy: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 40 });
    expect(s.createTask).toHaveBeenCalledWith(9, { title: 'Zamówić ulotki', description: null, dueDate: null, column: 'draft', assigneeIds: [6] }, viewer);
    const past = await as(jan).post('/tasks/projects/9/tasks', { ...task, dueDate: yesterday() });
    expect(past.status).toBe(400);
    expect(past.body.error.fields).toEqual({ dueDate: 'tasks.due_in_past' });
  });

  it('POST task 400 for an assignee outside the project (from the service)', async () => {
    vi.mocked(s.createTask).mockResolvedValue({ error: { status: 400, message: 'tasks.assignee_not_allowed', fields: { assigneeIds: 'tasks.assignee_not_allowed' } } });
    const res = await as(jan).post('/tasks/projects/9/tasks', task);
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({ assigneeIds: 'tasks.assignee_not_allowed' });
  });

  it('PUT task allows a past due date, 404 for an archived task', async () => {
    expect((await as(jan).put('/tasks/40', { ...task, dueDate: '2020-01-01' })).status).toBe(200);
    expect(s.updateTask).toHaveBeenCalledWith(40, expect.objectContaining({ dueDate: '2020-01-01' }), viewer);
    vi.mocked(s.updateTask).mockResolvedValue({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(jan).put('/tasks/40', task)).status).toBe(404);
  });

  it('POST move passes the column and the card to stand before; bad input → 400', async () => {
    expect((await as(jan).post('/tasks/40/move', { column: 'done', beforeTaskId: 12 })).status).toBe(200);
    expect(s.moveTask).toHaveBeenCalledWith(40, { column: 'done', beforeTaskId: 12 }, viewer);
    expect((await as(jan).post('/tasks/40/move', { column: 'archive', beforeTaskId: null })).status).toBe(400);
    vi.mocked(s.moveTask).mockResolvedValue({ error: { status: 400, message: 'tasks.before_task_invalid' } });
    expect((await as(jan).post('/tasks/40/move', { column: 'done', beforeTaskId: 999 })).status).toBe(400);
  });

  it('POST archive then 404 on the second time', async () => {
    expect((await as(jan).post('/tasks/40/archive')).status).toBe(200);
    expect(s.archiveTask).toHaveBeenCalledWith(40, viewer);
    vi.mocked(s.archiveTask).mockResolvedValue({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(jan).post('/tasks/40/archive')).status).toBe(404);
  });
});

describe('abuse', () => {
  it('forged ids in the address give 404 without calling the service', async () => {
    for (const id of ['0', '-1', '1e3', '0x10', '007', 'abc', '21;DROP']) {
      const at = encodeURIComponent(id);
      expect((await as(jan).post(`/tasks/projects/${at}/tasks`, task)).status).toBe(404);
      expect((await as(jan).put(`/tasks/${at}`, task)).status).toBe(404);
      expect((await as(jan).post(`/tasks/${at}/move`, { column: 'done', beforeTaskId: null })).status).toBe(404);
      expect((await as(jan).post(`/tasks/${at}/archive`)).status).toBe(404);
    }
    for (const fn of [s.createTask, s.updateTask, s.moveTask, s.archiveTask]) expect(fn).not.toHaveBeenCalled();
  });

  it('author, completion date and position from the body are ignored', async () => {
    await as(jan).post('/tasks/projects/9/tasks', { ...task, createdBy: 1, createdByName: 'Anna', position: 1, completedAt: '2020-01-01' });
    expect(vi.mocked(s.createTask).mock.calls[0]![1]).toEqual({ title: 'Zamówić ulotki', description: null, dueDate: null, column: 'draft', assigneeIds: [6] });
  });
});
