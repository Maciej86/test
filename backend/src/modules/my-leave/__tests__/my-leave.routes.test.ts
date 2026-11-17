import { describe, it } from 'vitest';

describe('my leave routes', () => {
  it.todo('without login → 401');
  it.todo('as admin → 403');
  it.todo('GET /my-leave/overview → 200 for req.user.id; no pool → 404');
  it.todo('GET /my-leave/requests?year=abc → 400');
  it.todo('POST /my-leave/requests → 201; user id from req.user, server-counted values ignored');
  it.todo('POST /my-leave/requests with bad data → 400 with fields');
  it.todo('POST /my-leave/requests/:id/withdraw → 200; abc → 404');
});
