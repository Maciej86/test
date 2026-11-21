// Docelowo: backend/src/modules/my-leave/__tests__/my-leave.service.test.ts i my-leave.routes.test.ts
import { describe, it } from 'vitest';

describe('my leave: day count and approval', () => {
  it.todo('request of a calendar type stores day_count = calendar and counts weekends');
  it.todo('request of a type without approval is approved at once with auto_approved = 1 and no decided_by');
  it.todo('request without approval notifies admins with leave_absence_reported and sends the "reported" e-mail');
  it.todo('request without approval may start 7 days ago; 8 days ago → 400 past_date');
  it.todo('request with approval starting yesterday → 400 past_date');
  it.todo('request without approval overlapping an approved leave → 409 overlap');
  it.todo('activity log of an auto-approved request has status approved and auto_approved');
  it.todo('withdraw auto-approved request before its first day → withdrawn, admins notified');
  it.todo('withdraw auto-approved request filed today, starting in the past → withdrawn');
  it.todo('withdraw auto-approved request filed earlier, already started → 409');
  it.todo('withdraw normally approved request → 409');
  it.todo('withdraw someone else’s request → 404');
  it.todo('two withdrawals at once → one succeeds, no server error');
  it.todo('list returns dayCount, autoApproved and canWithdraw');
});
