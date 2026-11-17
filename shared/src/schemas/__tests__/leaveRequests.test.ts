import { describe, expect, it } from 'vitest';
import { LEAVE_REQUESTS_MESSAGES as M } from '../../constants/leaveRequests';
import { leaveDecisionReasonSchema, leaveRequestsListQuerySchema } from '../leaveRequests';

const reasonError = (reason: string) => leaveDecisionReasonSchema.safeParse({ reason }).error?.issues[0];

describe('leaveDecisionReasonSchema', () => {
  it('reason of only spaces or 2 characters after trimming → error under reason', () => {
    expect(reasonError('   ')).toMatchObject({ path: ['reason'] });
    expect(reasonError(' ab ')).toMatchObject({ path: ['reason'], message: M.reasonMin });
    expect(leaveDecisionReasonSchema.safeParse({}).success).toBe(false);
  });

  it('trims " abc " to "abc"; 500 characters pass, 501 do not', () => {
    expect(leaveDecisionReasonSchema.parse({ reason: ' abc ' })).toEqual({ reason: 'abc' });
    expect(leaveDecisionReasonSchema.safeParse({ reason: 'x'.repeat(500) }).success).toBe(true);
    expect(reasonError('x'.repeat(501))).toMatchObject({ path: ['reason'], message: 'validation.too_long' });
  });
});

describe('leaveRequestsListQuerySchema', () => {
  it('defaults: status pending, page 1, empty search, no year, no type', () => {
    const q = leaveRequestsListQuerySchema.parse({});
    expect(q).toMatchObject({ status: 'pending', page: 1, search: '' });
    expect(q.year).toBeUndefined();
    expect(q.leaveTypeId).toBeUndefined();
  });

  it('reads values from the address', () => {
    expect(leaveRequestsListQuerySchema.parse({ status: 'approved', year: '2025', leaveTypeId: '3', page: '2', search: 'Jan' })).toMatchObject({
      status: 'approved', year: 2025, leaveTypeId: 3, page: 2, search: 'Jan',
    });
    expect(leaveRequestsListQuerySchema.parse({ status: 'all' }).status).toBe('all');
  });

  it('wrong values fall back to defaults: status=xyz → pending, year=abc → none, leaveTypeId=-1 → none', () => {
    const q = leaveRequestsListQuerySchema.parse({ status: 'xyz', year: 'abc', leaveTypeId: '-1' });
    expect(q.status).toBe('pending');
    expect(q.year).toBeUndefined();
    expect(q.leaveTypeId).toBeUndefined();
    expect(leaveRequestsListQuerySchema.parse({ year: '1999' }).year).toBeUndefined();
  });
});
