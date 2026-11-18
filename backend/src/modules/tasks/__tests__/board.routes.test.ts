import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../tasks.service', async (orig) => ({ ...(await orig<object>()), getBoard: vi.fn() }));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../tasks.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 5, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const get = (user: SessionUser | null, url: string) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  return request(createApp()).get(`/api${url}`).set('Cookie', user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '');
};
const board = { project: { id: 9, name: 'Marketing' }, people: [], tasks: [], oldDoneCount: 0, leaves: [] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(s.getBoard).mockResolvedValue(board);
});

describe('board route', () => {
  it('401 without login', async () => {
    expect((await get(null, '/tasks/projects/9/board')).status).toBe(401);
  });

  it('employee outside the project gets 404 from the service', async () => {
    vi.mocked(s.getBoard).mockResolvedValue({ error: { status: 404, message: 'server.not_found' } });
    expect((await get(jan, '/tasks/projects/9/board')).status).toBe(404);
    expect(s.getBoard).toHaveBeenCalledWith(9, { id: 5, name: 'Jan Kowalski', role: 'employee' }, false);
  });

  it('admin without membership gets the board', async () => {
    const res = await get(anna, '/tasks/projects/9/board');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(board);
  });

  it('old done tasks only with oldDone=1', async () => {
    await get(jan, '/tasks/projects/9/board?oldDone=1');
    expect(s.getBoard).toHaveBeenCalledWith(9, expect.anything(), true);
  });

  it('oldDone=2 gives 400, forged project id gives 404', async () => {
    expect((await get(jan, '/tasks/projects/9/board?oldDone=2')).status).toBe(400);
    for (const id of ['0', '1e3', '0x10', '007', 'abc']) expect((await get(jan, `/tasks/projects/${id}/board`)).status).toBe(404);
    expect(s.getBoard).not.toHaveBeenCalled();
  });
});
