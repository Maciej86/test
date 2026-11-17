import { describe, it } from 'vitest';

describe('leave requests routes', () => {
  it.todo('401 without login, 403 for an employee');
  it.todo('GET / validates the query and returns the list');
  it.todo('GET /:id → 404 for abc, 0 and a missing number');
  it.todo('POST /:id/reject and /:id/cancel without a reason → 400 under reason');
  it.todo('GET /:id/pdf: approved → application/pdf inline; other status → 409 not_approved');
});
