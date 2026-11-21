import { describe, it } from 'vitest';

describe('calendar routes', () => {
  it.todo('GET /calendar without login → 401');
  it.todo('GET /calendar as employee → 403');
  it.todo('GET /calendar as admin without from → range from today, 61 days');
  it.todo('GET /calendar?from=2026-12-01 → range 2026-12-01 – 2027-01-30');
  it.todo('GET /calendar?from=2026-02-30 → 400 with field from');
  it.todo('GET /calendar?from=1999-12-31 → 400');
});
