import { describe, it } from 'vitest';

describe('notifications queries', () => {
  it.todo('every query uses ? parameters');
  it.todo('insertNotifications: one INSERT with JSON params');
  it.todo('deleteOldRead: only read rows older than the given days, only the given users');
  it.todo('listForUser: own rows, newest first, unread filter, mapped to NotificationItem');
  it.todo('markRead: WHERE id AND user_id, keeps the first read_at; false when nothing matched');
  it.todo('markAllRead: only own unread rows');
});
