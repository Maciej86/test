import { describe, it } from 'vitest';

describe('archive routes', () => {
  it.todo('GET /archive/counts gives the number of archived accounts and tasks');
  it.todo('GET /archive/employees gives a page of archived accounts');
  it.todo('GET /archive/employees with an unknown sort column → 400');
  it.todo('POST /archive/employees/:id/restore restores the account');
  it.todo('POST /archive/employees/abc/restore → 404');
  it.todo('DELETE /archive/employees/:id without confirmName → 400');
  it.todo('DELETE /archive/employees/:id passes 409 has_leave_requests from the service');
  it.todo('GET /archive/tasks gives a page of archived tasks with projects');
  it.todo('GET /archive/tasks with projectId=0 → 400');
  it.todo('GET /archive/tasks/:id gives the task details');
  it.todo('GET /archive/tasks/:id of an active task → 404');
  it.todo('POST /archive/tasks/:id/restore restores the task');
  it.todo('DELETE /archive/tasks/:id deletes the task');
  it.todo('without logging in → 401');
  it.todo('employee → 403');
});
