import { describe, expect, it } from 'vitest';
import { leaveTypeSchema } from '../leaveTypes';

const base = { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: '' };
const issue = (r: { error?: { issues: { message: string; path: PropertyKey[] }[] } }, field: string) =>
  r.error?.issues.find((i) => i.path.join('.') === field)?.message;

describe('leaveTypeSchema', () => {
  it('name: 1 char → too_short, 2 ok, 40 ok, 41 → too_long', () => {
    expect(issue(leaveTypeSchema.safeParse({ ...base, name: 'S' }), 'name')).toBe('validation.too_short');
    expect(leaveTypeSchema.safeParse({ ...base, name: 'Sz' }).success).toBe(true);
    expect(leaveTypeSchema.safeParse({ ...base, name: 'a'.repeat(40) }).success).toBe(true);
    expect(issue(leaveTypeSchema.safeParse({ ...base, name: 'a'.repeat(41) }), 'name')).toBe('validation.too_long');
  });

  it('name: spaces trimmed, empty → required', () => {
    expect(leaveTypeSchema.parse({ ...base, name: ' Szkoleniowy ' }).name).toBe('Szkoleniowy');
    expect(issue(leaveTypeSchema.safeParse({ ...base, name: '   ' }), 'name')).toBe('validation.required');
  });

  it('yearlyLimit: empty or missing → null', () => {
    expect(leaveTypeSchema.parse(base).yearlyLimit).toBeNull();
    expect(leaveTypeSchema.parse({ name: 'Szkoleniowy', deductsPool: false }).yearlyLimit).toBeNull();
    expect(leaveTypeSchema.parse({ ...base, yearlyLimit: null }).yearlyLimit).toBeNull();
  });

  it('yearlyLimit: 1 and 365 ok; 0, 366 and 2.5 → error; "4" → 4', () => {
    expect(leaveTypeSchema.parse({ ...base, yearlyLimit: 1 }).yearlyLimit).toBe(1);
    expect(leaveTypeSchema.parse({ ...base, yearlyLimit: 365 }).yearlyLimit).toBe(365);
    expect(issue(leaveTypeSchema.safeParse({ ...base, yearlyLimit: 0 }), 'yearlyLimit')).toBe('validation.min');
    expect(issue(leaveTypeSchema.safeParse({ ...base, yearlyLimit: 366 }), 'yearlyLimit')).toBe('validation.max');
    expect(issue(leaveTypeSchema.safeParse({ ...base, yearlyLimit: 2.5 }), 'yearlyLimit')).toBe('validation.whole_number');
    expect(leaveTypeSchema.parse({ ...base, yearlyLimit: '4' }).yearlyLimit).toBe(4);
  });

  it('deductsPool missing → error', () => {
    expect(issue(leaveTypeSchema.safeParse({ name: 'Szkoleniowy' }), 'deductsPool')).toBeDefined();
  });
});

