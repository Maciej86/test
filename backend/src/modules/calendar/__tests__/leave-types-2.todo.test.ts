// Docelowo: backend/src/modules/leave-types/__tests__/leave-types.routes.test.ts i leave-types.queries.test.ts
import { describe, it } from 'vitest';

describe('leave types: day count and approval', () => {
  it.todo('POST /leave-types saves dayCount and requiresApproval');
  it.todo('PUT /leave-types/:id with dayCount outside the list → 400');
  it.todo('list and selectable types return dayCount and requiresApproval');
  it.todo('day_count and requires_approval change is logged in activity log (before → after)');
  it.todo('migration adds "Chorobowe" once (calendar, no approval, no pool, grape) and keeps an existing one');
});
