import { describe, it } from 'vitest';

describe('my leave queries', () => {
  it.todo('every query uses ? parameters and has user_id in WHERE');
  it.todo('setWithdrawn changes only pending requests of this user and returns affected rows');
  it.todo('sumPoolUsage: approved and pending days per user from saved columns');
  it.todo('countPendingRequests counts pending requests of the pool year');
  it.todo('countRequestsByLeaveType counts all requests per type');
  it.todo('findOpenPoolOfUser locks the row FOR UPDATE when asked');
});
