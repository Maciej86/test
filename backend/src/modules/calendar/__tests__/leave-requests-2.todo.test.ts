// Docelowo: backend/src/modules/leave-requests/__tests__/leave-requests.routes.test.ts
import { describe, it } from 'vitest';

describe('leave requests: auto-approved', () => {
  it.todo('approve auto-approved request → 409 already_decided');
  it.todo('reject auto-approved request → 409 already_decided');
  it.todo('cancel auto-approved request → cancelled, days return');
  it.todo('list, details, calendar and dashboard return dayCount and autoApproved');
  it.todo('PDF of auto-approved request shows "approved automatically"');
});
