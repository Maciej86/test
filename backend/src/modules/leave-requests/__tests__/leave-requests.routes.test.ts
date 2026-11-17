import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SessionUser } from '@app/shared';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn(), getConnection: vi.fn() } }));
vi.mock('../../../auth/users.queries', () => ({ findActiveUserById: vi.fn() }));
vi.mock('../leave-requests.service', () => ({
  listLeaveRequests: vi.fn(),
  getLeaveRequest: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  cancelRequest: vi.fn(),
  getLeaveRequestPdf: vi.fn(),
}));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const users = await import('../../../auth/users.queries');
const s = await import('../leave-requests.service');
const { createApp } = await import('../../../app');
const { signToken } = await import('../../../auth/token');
const { AUTH_COOKIE_NAME } = await import('../../../config/constants');
const { LEAVE_REQUESTS_MESSAGES: M } = await import('@app/shared');

const anna: SessionUser = { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false };
const jan: SessionUser = { id: 7, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const as = (user: SessionUser | null) => {
  vi.mocked(users.findActiveUserById).mockResolvedValue(user);
  const app = createApp();
  const cookie = user ? `${AUTH_COOKIE_NAME}=${signToken(user, 0)}` : '';
  return {
    get: (url: string) => request(app).get(`/api${url}`).set('Cookie', cookie),
    post: (url: string, body?: object) => request(app).post(`/api${url}`).set('Cookie', cookie).send(body),
  };
};

beforeEach(() => vi.clearAllMocks());

describe('leave requests routes', () => {
  it('401 without login, 403 for an employee', async () => {
    for (const user of [null, jan]) {
      const code = user ? 403 : 401;
      expect((await as(user).get('/leave-requests')).status).toBe(code);
      expect((await as(user).get('/leave-requests/21')).status).toBe(code);
      expect((await as(user).post('/leave-requests/21/approve')).status).toBe(code);
      expect((await as(user).post('/leave-requests/21/reject', { reason: 'Powód.' })).status).toBe(code);
      expect((await as(user).post('/leave-requests/21/cancel', { reason: 'Powód.' })).status).toBe(code);
      expect((await as(user).get('/leave-requests/21/pdf')).status).toBe(code);
    }
    expect(s.approveRequest).not.toHaveBeenCalled();
  });

  it('GET / validates the query and returns the list', async () => {
    vi.mocked(s.listLeaveRequests).mockResolvedValue({ items: [], total: 0 } as never);
    const res = await as(anna).get('/leave-requests?status=approved&year=2025&leaveTypeId=3&search=Jan&page=2');
    expect(res.status).toBe(200);
    expect(s.listLeaveRequests).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', year: 2025, leaveTypeId: 3, search: 'Jan', page: 2 }));
    await as(anna).get('/leave-requests?status=xyz');
    expect(s.listLeaveRequests).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('GET /:id → details; 404 for abc, 0 and a missing number', async () => {
    vi.mocked(s.getLeaveRequest).mockResolvedValueOnce({ id: 21 } as never);
    expect((await as(anna).get('/leave-requests/21')).body).toEqual({ id: 21 });
    for (const id of ['abc', '0', '1e3']) expect((await as(anna).get(`/leave-requests/${id}`)).status).toBe(404);
    vi.mocked(s.getLeaveRequest).mockResolvedValueOnce({ error: { status: 404, message: 'server.not_found' } });
    expect((await as(anna).get('/leave-requests/999999')).status).toBe(404);
  });

  it('decisions use req.user as the actor; 409 already_decided passes current status and who decided', async () => {
    vi.mocked(s.approveRequest).mockResolvedValueOnce({ ok: true });
    expect((await as(anna).post('/leave-requests/21/approve', { decidedBy: 99 })).body).toEqual({ ok: true });
    expect(s.approveRequest).toHaveBeenCalledWith(21, { id: 1, name: 'Anna Nowak' });
    vi.mocked(s.approveRequest).mockResolvedValueOnce({ error: { status: 409, message: M.alreadyDecided, current: 'approved', decidedByName: 'Marek Nowicki' } });
    const res = await as(anna).post('/leave-requests/21/approve');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ message: M.alreadyDecided, current: 'approved', decidedByName: 'Marek Nowicki' });
  });

  it('POST /:id/reject and /:id/cancel without a reason → 400 under reason; with a reason → service', async () => {
    for (const action of ['reject', 'cancel']) {
      const res = await as(anna).post(`/leave-requests/21/${action}`, { reason: '  ' });
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('reason');
    }
    vi.mocked(s.rejectRequest).mockResolvedValueOnce({ ok: true });
    await as(anna).post('/leave-requests/21/reject', { reason: ' Inwentaryzacja. ' });
    expect(s.rejectRequest).toHaveBeenCalledWith(21, 'Inwentaryzacja.', { id: 1, name: 'Anna Nowak' });
    vi.mocked(s.cancelRequest).mockResolvedValueOnce({ ok: true });
    await as(anna).post('/leave-requests/21/cancel', { reason: 'Przesunięty.' });
    expect(s.cancelRequest).toHaveBeenCalledWith(21, 'Przesunięty.', { id: 1, name: 'Anna Nowak' });
  });

  it('GET /:id/pdf: approved → application/pdf inline, no-store; other status → 409 not_approved', async () => {
    vi.mocked(s.getLeaveRequestPdf).mockResolvedValueOnce({ fileName: 'wniosek-urlopowy-21.pdf', pdf: Buffer.from('%PDF-1.7') });
    const res = await as(anna).get('/leave-requests/21/pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="wniosek-urlopowy-21.pdf"');
    expect(res.headers['cache-control']).toBe('no-store');
    vi.mocked(s.getLeaveRequestPdf).mockResolvedValueOnce({ error: { status: 409, message: M.notApproved } });
    expect((await as(anna).get('/leave-requests/21/pdf')).status).toBe(409);
  });
});
