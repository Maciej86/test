import { describe, it } from 'vitest';

describe('dashboard routes', () => {
  it.todo('GET /dashboard without login → 401');
  it.todo('GET /dashboard with a temporary password → 403');
  it.todo('GET /dashboard as admin → role admin with pending, absences, projects, overdue and myTasks');
  it.todo('GET /dashboard as employee → role employee without pending, absences, projects and overdue');
  it.todo('GET /dashboard passes req.user (not query or body) to the service');
});
