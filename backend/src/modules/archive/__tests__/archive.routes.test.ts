import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../../employees/employees.service', async (orig) => ({
  ...(await orig<object>()),
  listArchivedEmployees: vi.fn(),
  countArchivedEmployees: vi.fn(),
  restoreEmployee: vi.fn(),
  deleteArchivedEmployee: vi.fn(),
}));
vi.mock('../../tasks/tasks.service', async (orig) => ({
  ...(await orig<object>()),
  listArchivedTasks: vi.fn(),
  countArchivedTasks: vi.fn(),
  getArchivedTask: vi.fn(),
  restoreArchivedTask: vi.fn(),
  deleteArchivedTask: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const employees = await import('../../employees/employees.service');
const tasks = await import('../../tasks/tasks.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const actor = { id: 1, name: 'Anna Nowak' };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  const send = (method: 'get' | 'post' | 'delete', url: string) =>
    request(app)[method](`/api${url}`).set('Cookie', cookie).set('Origin', process.env.FRONTEND_URL ?? 'http://localhost:5173');
  return {
    get: (url: string) => send('get', url),
    post: (url: string) => send('post', url).send({}),
    delete: (url: string, body: object = {}) => send('delete', url).send(body),
  };
};

const page = { items: [], total: 0, page: 1, pageSize: 25 };

beforeEach(() => vi.clearAllMocks());

describe('archive routes', () => {
  it('GET /archive/counts gives the number of archived accounts and tasks', async () => {
    vi.mocked(employees.countArchivedEmployees).mockResolvedValue(3);
    vi.mocked(tasks.countArchivedTasks).mockResolvedValue(4);
    const res = await as(anna).get('/archive/counts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ employees: 3, tasks: 4 });
  });

  it('GET /archive/employees gives a page of archived accounts (newest first by default)', async () => {
    vi.mocked(employees.listArchivedEmployees).mockResolvedValue(page);
    const res = await as(anna).get('/archive/employees?page=2&search=olga');
    expect(res.status).toBe(200);
    expect(employees.listArchivedEmployees).toHaveBeenCalledWith({ page: 2, search: 'olga', sort: 'archived_at', dir: 'desc' });
  });

  it('GET /archive/employees with an unknown sort column → 400', async () => {
    expect((await as(anna).get('/archive/employees?sort=password_hash')).status).toBe(400);
    expect(employees.listArchivedEmployees).not.toHaveBeenCalled();
  });

  it('POST /archive/employees/:id/restore restores the account as the logged-in admin', async () => {
    vi.mocked(employees.restoreEmployee).mockResolvedValue({ ok: true });
    const res = await as(anna).post('/archive/employees/9/restore');
    expect(res.status).toBe(200);
    expect(employees.restoreEmployee).toHaveBeenCalledWith(9, actor);
  });

  it('POST /archive/employees/abc/restore → 404', async () => {
    expect((await as(anna).post('/archive/employees/abc/restore')).status).toBe(404);
    expect(employees.restoreEmployee).not.toHaveBeenCalled();
  });

  it('DELETE /archive/employees/:id without confirmName → 400', async () => {
    const res = await as(anna).delete('/archive/employees/9');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.confirmName).toBe('validation.required');
    expect(employees.deleteArchivedEmployee).not.toHaveBeenCalled();
  });

  it('DELETE /archive/employees/:id passes the trimmed name and 409 has_leave_requests from the service', async () => {
    vi.mocked(employees.deleteArchivedEmployee).mockResolvedValue({ error: { status: 409, message: 'archive.server.has_leave_requests' } });
    const res = await as(anna).delete('/archive/employees/9', { confirmName: ' Olga Testowa ' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('archive.server.has_leave_requests');
    expect(employees.deleteArchivedEmployee).toHaveBeenCalledWith(9, 'Olga Testowa', actor);
  });

  it('GET /archive/tasks gives a page of archived tasks with projects', async () => {
    vi.mocked(tasks.listArchivedTasks).mockResolvedValue({ ...page, projects: [{ id: 3, name: 'Biuro' }] });
    const res = await as(anna).get('/archive/tasks?projectId=3&search=spot');
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([{ id: 3, name: 'Biuro' }]);
    expect(tasks.listArchivedTasks).toHaveBeenCalledWith({ page: 1, search: 'spot', sort: 'archived_at', dir: 'desc', projectId: 3 });
  });

  it('GET /archive/tasks with projectId=0 → 400', async () => {
    expect((await as(anna).get('/archive/tasks?projectId=0')).status).toBe(400);
  });

  it('GET /archive/tasks/:id gives the task details; active or missing → 404', async () => {
    vi.mocked(tasks.getArchivedTask).mockResolvedValueOnce({ id: 31 } as never).mockResolvedValueOnce({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(anna).get('/archive/tasks/31')).body).toEqual({ id: 31 });
    expect((await as(anna).get('/archive/tasks/31')).status).toBe(404);
  });

  it('POST /archive/tasks/:id/restore and DELETE /archive/tasks/:id act as the logged-in admin', async () => {
    vi.mocked(tasks.restoreArchivedTask).mockResolvedValue({ ok: true });
    vi.mocked(tasks.deleteArchivedTask).mockResolvedValue({ error: { status: 409, message: 'server.archive_first' } });
    expect((await as(anna).post('/archive/tasks/31/restore')).status).toBe(200);
    expect(tasks.restoreArchivedTask).toHaveBeenCalledWith(31, actor);
    expect((await as(anna).delete('/archive/tasks/31')).status).toBe(409);
    expect(tasks.deleteArchivedTask).toHaveBeenCalledWith(31, actor);
  });

  it('without logging in → 401', async () => {
    expect((await as(null).get('/archive/counts')).status).toBe(401);
  });

  it('employee → 403', async () => {
    expect((await as(jan).delete('/archive/tasks/31')).status).toBe(403);
    expect(tasks.deleteArchivedTask).not.toHaveBeenCalled();
  });
});
