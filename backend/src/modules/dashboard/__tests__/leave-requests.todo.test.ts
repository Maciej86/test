// Docelowo: backend/src/modules/leave-requests/__tests__/dashboard.queries.test.ts
import { describe, it } from 'vitest';

describe('leave requests queries for the dashboard', () => {
  it.todo('listPendingForDashboard: only pending, any year, ORDER BY date_from, created_at, id, LIMIT ?, total of all pending');
  it.todo('listAbsences: approved and pending overlapping from–to, without archived accounts, ORDER BY date_from, name; no type or comment');
});
