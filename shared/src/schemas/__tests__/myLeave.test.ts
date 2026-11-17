import { describe, expect, it } from 'vitest';
import { leaveRequestSchema, myLeaveRequestsQuerySchema } from '../myLeave';

const base = { leaveTypeId: 1, dateFrom: '2026-12-21', dateTo: '2026-12-31', comment: '' };
const issue = (r: { error?: { issues: { message: string; path: PropertyKey[] }[] } }, field: string) =>
  r.error?.issues.find((i) => i.path.join('.') === field)?.message;

describe('leaveRequestSchema', () => {
  it('Od = Do (jeden dzień) is valid', () => {
    expect(leaveRequestSchema.safeParse({ ...base, dateTo: base.dateFrom }).success).toBe(true);
  });

  it('Do before Od → dateTo my-leave.validation.dates_order', () => {
    expect(issue(leaveRequestSchema.safeParse({ ...base, dateTo: '2026-12-20' }), 'dateTo')).toBe('my-leave.validation.dates_order');
  });

  it('different years → dateTo my-leave.validation.same_year', () => {
    expect(issue(leaveRequestSchema.safeParse({ ...base, dateTo: '2027-01-04' }), 'dateTo')).toBe('my-leave.validation.same_year');
  });

  it('comment: 500 chars ok, 501 → validation.too_long, empty → null', () => {
    expect(leaveRequestSchema.parse({ ...base, comment: 'a'.repeat(500) }).comment).toHaveLength(500);
    expect(issue(leaveRequestSchema.safeParse({ ...base, comment: 'a'.repeat(501) }), 'comment')).toBe('validation.too_long');
    expect(leaveRequestSchema.parse(base).comment).toBeNull();
    expect(leaveRequestSchema.parse({ ...base, comment: '  Święta u rodziców. ' }).comment).toBe('Święta u rodziców.');
  });

  it('bad date (2026-02-30, text) → validation.date; missing type → validation.required; "3" → 3', () => {
    expect(issue(leaveRequestSchema.safeParse({ ...base, dateFrom: '2026-02-30' }), 'dateFrom')).toBe('validation.date');
    expect(issue(leaveRequestSchema.safeParse({ ...base, dateTo: 'jutro' }), 'dateTo')).toBe('validation.date');
    expect(issue(leaveRequestSchema.safeParse({ ...base, leaveTypeId: null }), 'leaveTypeId')).toBe('validation.required');
    expect(issue(leaveRequestSchema.safeParse({ ...base, leaveTypeId: 0 }), 'leaveTypeId')).toBe('validation.min');
    expect(leaveRequestSchema.parse({ ...base, leaveTypeId: '3' }).leaveTypeId).toBe(3);
  });

  it('drops fields counted by the server (userId, workingDays, status)', () => {
    const parsed = leaveRequestSchema.parse({ ...base, userId: 9, workingDays: 1, status: 'approved' });
    expect(Object.keys(parsed).sort()).toEqual(['comment', 'dateFrom', 'dateTo', 'leaveTypeId']);
  });
});

describe('myLeaveRequestsQuerySchema', () => {
  it('year optional; 2000 and 2100 ok; 1999, 2101 and "abc" rejected', () => {
    expect(myLeaveRequestsQuerySchema.parse({}).year).toBeUndefined();
    expect(myLeaveRequestsQuerySchema.parse({ year: '2000' }).year).toBe(2000);
    expect(myLeaveRequestsQuerySchema.parse({ year: '2100' }).year).toBe(2100);
    for (const year of ['1999', '2101', 'abc', '2026.5']) expect(myLeaveRequestsQuerySchema.safeParse({ year }).success).toBe(false);
  });
});
