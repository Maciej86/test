import { describe, it } from 'vitest';

describe('leave types routes', () => {
  it.todo('GET /leave-types without login → 401');
  it.todo('GET /leave-types as employee → 403');
  it.todo('GET /leave-types → items in order');
  it.todo('POST /leave-types → 201 with id; bad data → 400');
  it.todo('POST /leave-types with taken name → 409 with fields.name');
  it.todo('PUT /leave-types/:id → ok; missing → 404; bad id → 404');
  it.todo('POST /leave-types/:id/move → ok; bad direction → 400');
  it.todo('POST /leave-types/:id/hide and /unhide → ok and 409 rules');
});
