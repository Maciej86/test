import { describe, it } from 'vitest';

describe('calendarQuerySchema', () => {
  it.todo('from missing → ok (today on the server)');
  it.todo('from 2026-11-17 → ok');
  it.todo('from 2026-02-30 → error');
  it.todo('from 1999-12-31 → error, 2000-01-01 → ok');
  it.todo('from 2100-01-01 → error, 2099-12-31 → ok');
});
