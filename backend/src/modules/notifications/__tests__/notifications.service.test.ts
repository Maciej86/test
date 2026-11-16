import { describe, it } from 'vitest';

describe('notifications service', () => {
  it.todo('notifyUsers skips the actor');
  it.todo('notifyUsers skips archived accounts and duplicates');
  it.todo('notifyUsers with no recipients does not insert');
  it.todo('notifyUsers cleans up read notifications older than 90 days of the recipients');
  it.todo('notifyUsers rejects a link outside /admin/');
  it.todo('notifyAdmins sends to active admins');
  it.todo('getSummary: unread count and 8 latest');
  it.todo('getList: page, unread filter, PAGE_SIZE');
  it.todo('readOne: someone else\'s → 404');
  it.todo('readAll returns updated count');
});
