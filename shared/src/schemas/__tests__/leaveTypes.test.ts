import { describe, expect, it } from 'vitest';
import { LEAVE_TYPE_COLORS } from '../../constants/leaveTypes';
import { leaveTypeSchema } from '../leaveTypes';

const base = { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: '', color: 'green', dayCount: 'working', requiresApproval: true };
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
    expect(leaveTypeSchema.parse({ name: 'Szkoleniowy', deductsPool: false, color: 'teal', dayCount: 'calendar', requiresApproval: false }).yearlyLimit).toBeNull();
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

  it('color: each of the 6 calendar colors ok', () => {
    expect(LEAVE_TYPE_COLORS).toEqual(['green', 'teal', 'cyan', 'navy', 'grape', 'orange']);
    for (const color of LEAVE_TYPE_COLORS) expect(leaveTypeSchema.parse({ ...base, color }).color).toBe(color);
  });

  it('color: status colors (yellow, red), unknown text or missing → error', () => {
    expect(issue(leaveTypeSchema.safeParse({ ...base, color: 'yellow' }), 'color')).toBe('validation.invalid_option');
    expect(issue(leaveTypeSchema.safeParse({ ...base, color: 'red' }), 'color')).toBe('validation.invalid_option');
    expect(issue(leaveTypeSchema.safeParse({ ...base, color: '#ff0000' }), 'color')).toBe('validation.invalid_option');
    expect(issue(leaveTypeSchema.safeParse({ name: 'Szkoleniowy', deductsPool: true, dayCount: 'working', requiresApproval: true }), 'color')).toBe('validation.required');
  });

  it('dayCount: working and calendar ok; hours or missing → error', () => {
    expect(leaveTypeSchema.parse({ ...base, dayCount: 'working' }).dayCount).toBe('working');
    expect(leaveTypeSchema.parse({ ...base, dayCount: 'calendar' }).dayCount).toBe('calendar');
    expect(issue(leaveTypeSchema.safeParse({ ...base, dayCount: 'hours' }), 'dayCount')).toBe('validation.invalid_option');
    const { dayCount: _d, ...noDayCount } = base;
    expect(issue(leaveTypeSchema.safeParse(noDayCount), 'dayCount')).toBe('validation.required');
  });

  it('requiresApproval: true and false ok; text or missing → required', () => {
    expect(leaveTypeSchema.parse({ ...base, requiresApproval: false }).requiresApproval).toBe(false);
    expect(leaveTypeSchema.parse({ ...base, requiresApproval: true }).requiresApproval).toBe(true);
    expect(issue(leaveTypeSchema.safeParse({ ...base, requiresApproval: 'tak' }), 'requiresApproval')).toBe('validation.required');
    const { requiresApproval: _r, ...noApproval } = base;
    expect(issue(leaveTypeSchema.safeParse(noApproval), 'requiresApproval')).toBe('validation.required');
  });
});
