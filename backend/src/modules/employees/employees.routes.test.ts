import { describe, it } from 'vitest';

describe('employees routes', () => {
  it.todo('GET /employees without login → 401');
  it.todo('GET /employees as employee → 403');
  it.todo('GET /employees: items without password_hash, isMe for req.user, pool null for admin, openYear and counts');
  it.todo('GET /employees?sort=days_left works; sort=password → 400');
  it.todo('POST /employees: creates user with hashed temporary password and pool for the open year, history without password');
  it.todo('POST /employees: active login taken → 409 fields.login = validation.login_taken');
  it.todo('POST /employees: login of archived account (any case) → 409 employees.login_taken_archived + archivedUser');
  it.todo('POST /employees: e-mail taken → 409 fields.email (active and archived)');
  it.todo('POST /employees: ER_DUP_ENTRY from the database → 409');
  it.todo('PUT /employees/:id: missing or archived → 404');
  it.todo('PUT /employees/:id: own role change → 409 employees.own_role');
  it.todo('PUT /employees/:id: employee pool saved for the open year; carried 70 ok');
  it.todo('PUT /employees/:id: employee → admin → employee keeps the same pool row');
  it.todo('PUT /employees/:id: no changes → no history entry');
  it.todo('POST /employees/:id/password: temporary password, history without password or hash');
  it.todo('POST /employees/:id/archive: own account → 409 archive_self; already archived → 409');
  it.todo('POST /employees/:id/restore: active → 409 not_archived; archived → restored with history');
  it.todo('GET /employees/close-year: preview with left days, canClose');
  it.todo('POST /employees/close-year: 26+4-9 → new pool 26 with 21 carried; archived get last annual');
  it.todo('POST /employees/close-year twice for the same year → 409 year_not_open');
  it.todo('POST /employees/close-year for a year after the current one → 409 year_too_early');
  it.todo('POST /employees/close-year ignores unknown userIds');
  it.todo('account archived during the session → 401 on the next request');
});
