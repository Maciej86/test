import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../comments.service', () => ({ listTaskComments: vi.fn(), addComment: vi.fn(), editComment: vi.fn(), removeComment: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../comments.service');
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
    delete: (url: string) => request(app).delete(`/api${url}`).set('Cookie', cookie),
  };
};

const listed = [{ id: 3, authorId: 5, authorName: 'Jan Kowalski', authorArchived: false, text: 'Tonery', createdAt: '2026-11-19T08:30:00.000Z', editedAt: null, canEdit: true, canDelete: true }];
const err = (status: number, message: string) => ({ error: { status, message } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.listTaskComments).mockResolvedValue(listed);
  vi.mocked(s.addComment).mockResolvedValue({ id: 12 });
  vi.mocked(s.editComment).mockResolvedValue({ ok: true });
  vi.mocked(s.removeComment).mockResolvedValue({ ok: true });
});

describe('comments routes', () => {
  it('401 without login', async () => {
    expect((await as(null).get('/tasks/7/comments')).status).toBe(401);
    expect((await as(null).post('/tasks/7/comments', { text: 'Ok' })).status).toBe(401);
    expect((await as(null).put('/tasks/comments/3', { text: 'Ok' })).status).toBe(401);
    expect((await as(null).delete('/tasks/comments/3')).status).toBe(401);
    expect(s.addComment).not.toHaveBeenCalled();
  });

  it('GET /tasks/:taskId/comments 200 with the list; 404 from the service', async () => {
    const res = await as(jan).get('/tasks/7/comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(listed);
    expect(s.listTaskComments).toHaveBeenCalledWith(7, viewer);
    vi.mocked(s.listTaskComments).mockResolvedValue(err(404, 'server.not_found'));
    expect((await as(jan).get('/tasks/7/comments')).status).toBe(404);
  });

  it('POST 201 with the viewer from the session, forged author fields ignored; empty text → 400 with field text', async () => {
    const res = await as(jan).post('/tasks/7/comments', { text: '  Tonery  ', userId: 1, authorName: 'Anna Nowak' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 12 });
    expect(s.addComment).toHaveBeenCalledWith(7, { text: 'Tonery' }, viewer);
    const empty = await as(jan).post('/tasks/7/comments', { text: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields).toEqual({ text: 'validation.required' });
    expect((await as(jan).post('/tasks/7/comments', { text: 'a'.repeat(2001) })).status).toBe(400);
    expect(s.addComment).toHaveBeenCalledTimes(1);
  });

  it('PUT /tasks/comments/:id passes the text; 403 and 404 from the service; bad number → 404 without the service', async () => {
    expect((await as(jan).put('/tasks/comments/3', { text: 'Nowy' })).body).toEqual({ ok: true });
    expect(s.editComment).toHaveBeenCalledWith(3, { text: 'Nowy' }, viewer);
    vi.mocked(s.editComment).mockResolvedValue(err(403, 'tasks.comment_not_author'));
    const forbidden = await as(jan).put('/tasks/comments/3', { text: 'Nowy' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.message).toBe('tasks.comment_not_author');
    vi.mocked(s.editComment).mockResolvedValue(err(404, 'tasks.comment_not_found'));
    expect((await as(jan).put('/tasks/comments/3', { text: 'Nowy' })).status).toBe(404);
    expect((await as(jan).put('/tasks/comments/3', { text: '' })).status).toBe(400);
    vi.mocked(s.editComment).mockClear();
    for (const id of ['0', 'abc', '1e3']) expect((await as(jan).put(`/tasks/comments/${id}`, { text: 'Nowy' })).status).toBe(404);
    expect(s.editComment).not.toHaveBeenCalled();
  });

  it('DELETE /tasks/comments/:id ok; 403 and 404 from the service', async () => {
    expect((await as(jan).delete('/tasks/comments/3')).body).toEqual({ ok: true });
    expect(s.removeComment).toHaveBeenCalledWith(3, viewer);
    vi.mocked(s.removeComment).mockResolvedValue(err(403, 'tasks.comment_not_author'));
    expect((await as(jan).delete('/tasks/comments/3')).status).toBe(403);
    vi.mocked(s.removeComment).mockResolvedValue(err(404, 'tasks.comment_not_found'));
    expect((await as(jan).delete('/tasks/comments/3')).status).toBe(404);
  });
});
