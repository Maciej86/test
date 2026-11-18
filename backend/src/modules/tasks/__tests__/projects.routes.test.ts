import { describe, it } from 'vitest';

describe('projects routes', () => {
  it.todo('401 without login');
  it.todo('403 for an employee on admin-only routes');
  it.todo('GET /projects: admin gets all, employee only own projects');
  it.todo('POST /projects 201, 400 fields, 409 name taken');
  it.todo('POST /projects rejects admin or archived members');
  it.todo('PUT /projects/:id 404 for unknown project');
  it.todo('POST /projects/:id/move moves with arrows');
  it.todo('DELETE /projects/:id 400 on wrong confirm name, ok with deleted task count');
  it.todo('abuse: forged ids in the address give 404');
});
