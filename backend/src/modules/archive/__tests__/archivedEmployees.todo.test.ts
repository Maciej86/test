import { describe, it } from 'vitest';

describe('archived employees', () => {
  it.todo('list: only archived accounts, newest first, with leave request and task counts');
  it.todo('list: search by name and login uses LIKE ?');
  it.todo('delete: missing account → 404');
  it.todo('delete: active account → 409 archive_first, nothing deleted');
  it.todo('delete: account with leave requests → 409 has_leave_requests, nothing deleted');
  it.todo('delete: wrong confirmName → 400 on the field, nothing deleted');
  it.todo('delete: deletes the account and logs delete / users with the name');
});
