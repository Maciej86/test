import { describe, it } from 'vitest';

describe('leaveTypeSchema', () => {
  it.todo('name: 1 char → too_short, 2 ok, 40 ok, 41 → too_long');
  it.todo('name: spaces trimmed, empty → required');
  it.todo('yearlyLimit: empty or missing → null');
  it.todo('yearlyLimit: 1 and 365 ok; 0, 366 and 2.5 → error; "4" → 4');
  it.todo('deductsPool missing → error');
});

describe('leaveTypeMoveSchema', () => {
  it.todo('direction up/down ok, left → error');
});
