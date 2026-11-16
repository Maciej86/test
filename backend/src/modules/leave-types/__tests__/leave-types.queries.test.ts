import { describe, it } from 'vitest';

describe('leave types queries', () => {
  it.todo('every query uses ? parameters');
  it.todo('listLeaveTypes: visible by position, then hidden by name, mapped to LeaveTypeItem with requestsCount 0');
  it.todo('findSelectableLeaveType: hidden type → null');
  it.todo('lockVisible locks visible rows FOR UPDATE ordered by position');
});
