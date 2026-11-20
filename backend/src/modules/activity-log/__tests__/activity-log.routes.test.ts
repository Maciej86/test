import { describe, it } from 'vitest';

describe('activity-log routes', () => {
  it.todo('GET /activity-log without login → 401');
  it.todo('GET /activity-log as employee → 403');
  it.todo('GET /activity-log as admin → list with filters from the query');
  it.todo('GET /activity-log second page');
  it.todo('GET /activity-log with bad filter values drops them');
  it.todo('GET /activity-log/people as admin → authors');
  it.todo('no write routes: POST, PATCH, DELETE → 404');
});
