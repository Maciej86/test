// Docelowo: shared/src/__tests__/leaveRequestCheck.test.ts
import { describe, it } from 'vitest';

describe('checkLeaveRequest: day count and approval', () => {
  it.todo('type without approval: 7 days ago ok, 8 days ago → past_date');
  it.todo('type with approval: yesterday → past_date');
  it.todo('calendar type: Friday–Monday = 4 days, Saturday–Sunday = 2 days (not no_working_days)');
  it.todo('calendar type limit 14: 14 days ok, 15 → limit_exceeded');
  it.todo('calendar type deducting pool takes calendar days from pool');
  it.todo('backdated start in closed year → year_closed');
  it.todo('earliestLeaveStart: today with approval, today − 7 without');
  it.todo('canWithdrawRequest: pending, auto before start, auto filed today, auto started earlier, normal approved');
});
