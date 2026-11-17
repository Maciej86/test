import { describe, it } from 'vitest';

describe('leaveRequestSchema', () => {
  it.todo('Od = Do (jeden dzień) is valid');
  it.todo('Do before Od → dateTo my-leave.validation.dates_order');
  it.todo('different years → dateTo my-leave.validation.same_year');
  it.todo('comment: 500 chars ok, 501 → validation.too_long, empty → null');
  it.todo('bad date (2026-02-30, text) → validation.date; missing type → validation.required');
});

describe('myLeaveRequestsQuerySchema', () => {
  it.todo('year optional; 2000 and 2100 ok; 1999, 2101 and "abc" rejected');
});
