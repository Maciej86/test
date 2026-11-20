import { describe, it } from 'vitest';

describe('activityLogQuerySchema', () => {
  it.todo('defaults: page 1, empty search, no filters');
  it.todo('search longer than 100 characters is rejected');
  it.todo('unknown area, bad userId and bad dates are dropped');
  it.todo('from and to are inclusive ISO dates; to before from is rejected');
});
