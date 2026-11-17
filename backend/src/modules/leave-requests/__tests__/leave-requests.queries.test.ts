import { describe, it } from 'vitest';

describe('leave requests queries', () => {
  it.todo('listRequests filters by status, pool_year (not for pending), leave type and employee name, with ? parameters');
  it.todo('listRequests orders pending by created_at ASC and others by date_from DESC; page 2 uses OFFSET');
  it.todo('pendingSummary returns count and the oldest created_at; listRequestYears returns distinct pool years');
  it.todo('findRequest locks the row FOR UPDATE only with lock');
  it.todo('listOverlapping: other people, pending and approved, a shared edge day counts');
  it.todo('setDecision updates only when the status still matches and saves who, when and the reason');
});
