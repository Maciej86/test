import { describe, it } from 'vitest';

describe('employee schemas', () => {
  it.todo('name: 1 character → name_too_short, 2 and 150 ok, 151 → too_long');
  it.todo('login with capitals and spaces around is saved lowercase');
  it.todo('empty notification e-mail becomes null');
  it.todo('role employee without annualDays → required on annualDays; admin without pool ok');
  it.todo('carriedDays 120 ok, 121 → range; carried 70 ok');
  it.todo('create: password Urlop2026 → password_rules');
  it.todo('closeYearSchema: pools with annualDays 61 → range');
  it.todo('list query: role=kot → no role filter; sort=password → list_sort');
});
