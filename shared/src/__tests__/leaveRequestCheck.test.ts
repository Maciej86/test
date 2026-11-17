import { describe, it } from 'vitest';

describe('checkLeaveRequest', () => {
  it.todo('21–31.12.2026 = 7 working days (Wigilia is a holiday)');
  it.todo('split: carried days first (4 left in carried → 4 carried + 3 annual)');
  it.todo('type that does not deduct → 0 / 0 and leftAfter null');
  it.todo('overlap on the edge day (Od = other Do) → overlap with the other request');
  it.todo('only Saturday and Sunday → no_working_days');
  it.todo('limit 1 used + 4 requested > 4 → limit_exceeded');
  it.todo('4 days requested with 3 left → not_enough_days');
  it.todo('yesterday → past_date');
  it.todo('2027 with open pool 2026 → pool_not_ready; 2025 → year_closed');
});
