import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('../notifications.queries', () => ({
  insertNotifications: vi.fn(),
  deleteOldRead: vi.fn(),
  activeUserIds: vi.fn(),
  activeIdsByRole: vi.fn(),
  countUnread: vi.fn(),
  listForUser: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

const q = await import('../notifications.queries');
const s = await import('../notifications.service');

const conn = { query: vi.fn() } as never;
const anna = { id: 1, name: 'Anna Nowak' };
const approved = { type: 'leave_approved' as const, params: { leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12' }, link: '/admin/my-leave', actor: anna };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.activeUserIds).mockImplementation(async (_db, ids) => ids);
});

describe('notifications service', () => {
  it('notifyUsers skips the actor', async () => {
    expect(await s.notifyUsers(conn, { ...approved, userIds: [1, 4] })).toBe(1);
    expect(q.activeUserIds).toHaveBeenCalledWith(conn, [4]);
    expect(q.insertNotifications).toHaveBeenCalledWith(conn, [
      { userId: 4, type: 'leave_approved', params: approved.params, actorName: 'Anna Nowak', link: '/admin/my-leave' },
    ]);
  });

  it('notifyUsers skips archived accounts and duplicates', async () => {
    vi.mocked(q.activeUserIds).mockResolvedValue([4]);
    expect(await s.notifyUsers(conn, { ...approved, userIds: [4, 4, 7] })).toBe(1);
    expect(q.activeUserIds).toHaveBeenCalledWith(conn, [4, 7]);
    expect(vi.mocked(q.insertNotifications).mock.calls[0]![1]).toHaveLength(1);
  });

  it('notifyUsers with no recipients does not insert', async () => {
    expect(await s.notifyUsers(conn, { ...approved, userIds: [1] })).toBe(0);
    vi.mocked(q.activeUserIds).mockResolvedValue([]);
    expect(await s.notifyUsers(conn, { ...approved, userIds: [9] })).toBe(0);
    expect(q.insertNotifications).not.toHaveBeenCalled();
    expect(q.deleteOldRead).not.toHaveBeenCalled();
  });

  it('notifyUsers cleans up read notifications older than 90 days of the recipients', async () => {
    await s.notifyUsers(conn, { ...approved, userIds: [4, 5] });
    expect(q.deleteOldRead).toHaveBeenCalledWith(conn, [4, 5], 90);
  });

  it('notifyUsers rejects a link outside /admin/', async () => {
    for (const link of ['https://evil.example/admin/', '//evil.example', '/admin//evil.example', 'javascript:alert(1)', '/login']) {
      await expect(s.notifyUsers(conn, { ...approved, link, userIds: [4] })).rejects.toThrow();
    }
    expect(q.insertNotifications).not.toHaveBeenCalled();
  });

  it('notifyAdmins sends to active admins, not to the actor', async () => {
    vi.mocked(q.activeIdsByRole).mockResolvedValue([1, 3]);
    const input = { type: 'leave_request_new' as const, params: { employee: 'Jan Kowalski' }, link: '/admin/leave-requests', actor: { id: 2, name: 'Jan Kowalski' } };
    expect(await s.notifyAdmins(conn, input)).toBe(2);
    expect(vi.mocked(q.insertNotifications).mock.calls[0]![1].map((r) => r.userId)).toEqual([1, 3]);
    expect(q.activeIdsByRole).toHaveBeenCalledWith(conn, 'admin');
    expect(await s.notifyAdmins(conn, { ...input, actor: anna })).toBe(1);
  });

  it('getSummary: unread count and 8 latest', async () => {
    vi.mocked(q.countUnread).mockResolvedValue(3);
    vi.mocked(q.listForUser).mockResolvedValue({ items: [], total: 12 });
    expect(await s.getSummary(4)).toEqual({ unread: 3, latest: [] });
    expect(q.listForUser).toHaveBeenCalledWith(expect.anything(), 4, { page: 1, unreadOnly: false, limit: 8 });
  });

  it('getList: page, unread filter, PAGE_SIZE', async () => {
    vi.mocked(q.countUnread).mockResolvedValue(2);
    vi.mocked(q.listForUser).mockResolvedValue({ items: [], total: 40 });
    expect(await s.getList(4, { page: 2, unread: '1' })).toEqual({ items: [], total: 40, page: 2, pageSize: 25, unread: 2 });
    expect(q.listForUser).toHaveBeenCalledWith(expect.anything(), 4, { page: 2, unreadOnly: true, limit: 25 });
  });

  it('readOne: someone else\'s → 404', async () => {
    vi.mocked(q.markRead).mockResolvedValue(false);
    expect(await s.readOne(4, 9)).toEqual({ error: { status: 404, message: 'server.not_found' } });
    vi.mocked(q.markRead).mockResolvedValue(true);
    expect(await s.readOne(4, 7)).toEqual({ ok: true });
    expect(q.markRead).toHaveBeenLastCalledWith(expect.anything(), 4, 7);
  });

  it('readAll returns updated count', async () => {
    vi.mocked(q.markAllRead).mockResolvedValue(5);
    expect(await s.readAll(4)).toEqual({ updated: 5 });
    expect(q.markAllRead).toHaveBeenCalledWith(expect.anything(), 4);
  });
});
