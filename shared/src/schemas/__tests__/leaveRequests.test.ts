import { describe, it } from 'vitest';

describe('leaveDecisionReasonSchema', () => {
  it.todo('reason of only spaces or 2 characters after trimming → reason_min under reason');
  it.todo('trims " abc " to "abc"; 500 characters pass, 501 do not');
});

describe('leaveRequestsListQuerySchema', () => {
  it.todo('defaults: status pending, page 1, empty search, no year, no type');
  it.todo('wrong values fall back to defaults: status=xyz → pending, year=abc → none, leaveTypeId=-1 → none');
});
