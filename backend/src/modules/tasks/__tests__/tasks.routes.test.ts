import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const jan: SessionUser = { id: 5, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return { get: (url: string) => request(createApp()).get(`/api${url}`).set('Cookie', cookie), post: (url: string, body?: object) => request(createApp()).post(`/api${url}`).set('Cookie', cookie).send(body) };
};

describe('tasks routes', () => {
  it('401 without login, 403 for an employee on the admin-only project routes', async () => {
    expect((await as(null).get('/tasks/projects')).status).toBe(401);
    expect((await as(jan).post('/tasks/projects', { name: 'Marketing', memberIds: [] })).status).toBe(403);
  });

  it.todo('POST task 201 and 400 for due date in the past');
  it.todo('POST task 400 for assignee outside the project');
  it.todo('PUT task allows a past due date, 404 for archived task');
  it.todo('POST move 400 for beforeTaskId from another project');
  it.todo('POST archive then 404 on the second time');
  it.todo('abuse: forged ids in the address give 404 without calling the service');
});
