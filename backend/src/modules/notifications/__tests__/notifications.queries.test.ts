import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/pool', () => ({ pool: { query: vi.fn() } }));
const q = await import('../notifications.queries');

const db = (rows: unknown = []) => ({ query: vi.fn().mockResolvedValue([rows]) });
type Spy = ReturnType<typeof db>;
const sqlOf = (spy: Spy, call = 0) => spy.query.mock.calls[call]![0] as string;
const paramsOf = (spy: Spy, call = 0) => spy.query.mock.calls[call]![1] as unknown[];

describe('notifications queries', () => {
  it('insertNotifications: one INSERT with JSON params, values only as ?', async () => {
    const spy = db({ affectedRows: 2 });
    await q.insertNotifications(spy, [
      { userId: 4, type: 'leave_approved', params: { leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08' }, actorName: 'Anna Nowak', link: '/admin/my-leave' },
      { userId: 5, type: 'task_assigned', params: { task: "Robert'); DROP TABLE users; --" }, actorName: null, link: '/admin/tasks' },
    ]);
    expect(spy.query).toHaveBeenCalledTimes(1);
    expect(sqlOf(spy)).toBe('INSERT INTO notifications (user_id, type, params, actor_name, link) VALUES ?');
    expect(sqlOf(spy)).not.toMatch(/Wypoczynkowy|DROP/);
    expect(paramsOf(spy)).toEqual([[
      [4, 'leave_approved', JSON.stringify({ leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08' }), 'Anna Nowak', '/admin/my-leave'],
      [5, 'task_assigned', JSON.stringify({ task: "Robert'); DROP TABLE users; --" }), null, '/admin/tasks'],
    ]]);
  });

  it('insertNotifications with no rows does not query', async () => {
    const spy = db();
    await q.insertNotifications(spy, []);
    expect(spy.query).not.toHaveBeenCalled();
  });

  it('deleteOldRead: only read rows older than the given days, only the given users', async () => {
    const spy = db({ affectedRows: 3 });
    await q.deleteOldRead(spy, [4, 5], 90);
    expect(sqlOf(spy)).toMatch(/DELETE FROM notifications WHERE user_id IN \(\?\) AND read_at IS NOT NULL AND read_at < NOW\(\) - INTERVAL \? DAY/);
    expect(paramsOf(spy)).toEqual([[4, 5], 90]);
  });

  it('activeUserIds: only active accounts from the given ids', async () => {
    const spy = db([{ id: 4 }]);
    expect(await q.activeUserIds(spy, [4, 9])).toEqual([4]);
    expect(sqlOf(spy)).toMatch(/FROM users WHERE id IN \(\?\) AND archived_at IS NULL/);
    expect(paramsOf(spy)).toEqual([[4, 9]]);
    const none = db();
    expect(await q.activeUserIds(none, [])).toEqual([]);
    expect(none.query).not.toHaveBeenCalled();
  });

  it('activeAdminIds: active admins only', async () => {
    const spy = db([{ id: 1 }, { id: 3 }]);
    expect(await q.activeAdminIds(spy)).toEqual([1, 3]);
    expect(sqlOf(spy)).toMatch(/FROM users WHERE role = \? AND archived_at IS NULL/);
    expect(paramsOf(spy)).toEqual(['admin']);
  });

  it.todo('listForUser: own rows, newest first, unread filter, mapped to NotificationItem');
  it.todo('markRead: WHERE id AND user_id, keeps the first read_at; false when nothing matched');
  it.todo('markAllRead: only own unread rows');
});
