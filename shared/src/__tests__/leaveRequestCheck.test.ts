import { describe, expect, it } from 'vitest';
import { canWithdrawRequest, checkLeaveRequest, earliestLeaveStart, type LeaveRequestCheckContext, type LeaveRequestCheckType } from '../leaveRequestCheck';

const vacation: LeaveRequestCheckType = { deductsPool: true, yearlyLimit: null, usedOfLimit: 0, dayCount: 'working', requiresApproval: true };
/** Chorobowe: dni kalendarzowe, bez zatwierdzania, nie odejmuje dni z puli. */
const sick: LeaveRequestCheckType = { deductsPool: false, yearlyLimit: null, usedOfLimit: 0, dayCount: 'calendar', requiresApproval: false };
const ctx: LeaveRequestCheckContext = {
  poolYear: 2026,
  annualDays: 26,
  carriedDays: 4,
  usedCarried: 0,
  usedAnnual: 0,
  pendingCarried: 0,
  pendingAnnual: 0,
  busy: [],
};
const today = '2026-11-17';
const check = (dateFrom: string, dateTo: string, type = vacation, c: Partial<LeaveRequestCheckContext> = {}) =>
  checkLeaveRequest({ type, dateFrom, dateTo, today }, { ...ctx, ...c });

describe('checkLeaveRequest', () => {
  it('21–31.12.2026 = 7 working days (Wigilia is a holiday)', () => {
    expect(check('2026-12-21', '2026-12-31')).toMatchObject({ kind: 'ok', workingDays: 7 });
  });

  it('split: carried days first (4 left in carried → 4 carried + 3 annual), leftAfter', () => {
    expect(check('2026-12-21', '2026-12-31')).toEqual({ kind: 'ok', workingDays: 7, dayCount: 'working', fromCarried: 4, fromAnnual: 3, leftAfter: 23 });
    // 1 zaległy zatwierdzony i 1 czekający: zostały 2 zaległe.
    expect(check('2026-12-21', '2026-12-31', vacation, { usedCarried: 1, pendingCarried: 1, pendingAnnual: 2 })).toEqual({
      kind: 'ok', workingDays: 7, dayCount: 'working', fromCarried: 2, fromAnnual: 5, leftAfter: 19,
    });
  });

  it('type that does not deduct → 0 / 0 and leftAfter null, even with an empty pool', () => {
    expect(check('2026-12-21', '2026-12-21', { ...vacation, deductsPool: false }, { annualDays: 0, carriedDays: 0 })).toEqual({
      kind: 'ok', workingDays: 1, dayCount: 'working', fromCarried: 0, fromAnnual: 0, leftAfter: null,
    });
  });

  it('overlap on the edge day (Od = other Do) → overlap with the other request', () => {
    const other = { dateFrom: '2026-11-26', dateTo: '2026-11-27', leaveTypeName: 'Wypoczynkowy', status: 'pending' as const };
    expect(check('2026-11-27', '2026-11-30', vacation, { busy: [other] })).toEqual({ kind: 'overlap', other });
    expect(check('2026-11-25', '2026-11-26', vacation, { busy: [other] })).toEqual({ kind: 'overlap', other });
    expect(check('2026-11-30', '2026-12-01', vacation, { busy: [other] }).kind).toBe('ok');
  });

  it('only Saturday and Sunday → no_working_days', () => {
    expect(check('2026-11-21', '2026-11-22')).toEqual({ kind: 'no_working_days' });
  });

  it('limit 1 used + 4 requested > 4 → limit_exceeded; exactly the limit is ok', () => {
    const onDemand = { ...vacation, yearlyLimit: 4, usedOfLimit: 1 };
    expect(check('2026-11-23', '2026-11-26', onDemand)).toEqual({ kind: 'limit_exceeded', limit: 4, used: 1, days: 4 });
    expect(check('2026-11-23', '2026-11-25', onDemand).kind).toBe('ok');
  });

  it('4 days requested with 3 left → not_enough_days with pending days; exactly what is left is ok', () => {
    const tight = { annualDays: 5, carriedDays: 0, usedAnnual: 1, pendingAnnual: 1 };
    expect(check('2026-11-23', '2026-11-26', vacation, tight)).toEqual({ kind: 'not_enough_days', days: 4, left: 3, pending: 1 });
    expect(check('2026-11-23', '2026-11-25', vacation, tight)).toMatchObject({ kind: 'ok', leftAfter: 0 });
  });

  it('yesterday → past_date; today is ok', () => {
    expect(check('2026-11-16', '2026-11-17')).toEqual({ kind: 'past_date' });
    expect(check('2026-11-17', '2026-11-17').kind).toBe('ok');
  });

  it('2027 with open pool 2026 → pool_not_ready; 2025 → year_closed (before the overlap check)', () => {
    expect(check('2027-01-11', '2027-01-15')).toEqual({ kind: 'pool_not_ready', year: 2027, openYear: 2026 });
    expect(check('2025-12-29', '2025-12-30', vacation, { poolYear: 2026 }).kind).toBe('past_date');
    expect(checkLeaveRequest({ type: vacation, dateFrom: '2025-12-29', dateTo: '2025-12-30', today: '2025-12-01' }, ctx)).toEqual({
      kind: 'year_closed', year: 2025,
    });
  });
});

describe('checkLeaveRequest: day count and approval (calendar part 2)', () => {
  it('type without approval: 7 days ago ok, 8 days ago → past_date', () => {
    expect(check('2026-11-10', '2026-11-17', sick)).toMatchObject({ kind: 'ok', workingDays: 8, dayCount: 'calendar' });
    expect(check('2026-11-09', '2026-11-17', sick)).toEqual({ kind: 'past_date' });
  });

  it('type with approval: yesterday → past_date, today ok', () => {
    expect(check('2026-11-16', '2026-11-18')).toEqual({ kind: 'past_date' });
    expect(check('2026-11-17', '2026-11-18')).toMatchObject({ kind: 'ok' });
  });

  it('calendar type: Friday–Monday = 4 days, Saturday–Sunday = 2 days (not no_working_days), holidays count too', () => {
    expect(check('2026-11-20', '2026-11-23', sick)).toMatchObject({ kind: 'ok', workingDays: 4 });
    expect(check('2026-11-21', '2026-11-22', sick)).toMatchObject({ kind: 'ok', workingDays: 2 });
    expect(check('2026-12-24', '2026-12-26', sick)).toMatchObject({ kind: 'ok', workingDays: 3 });
    expect(check('2026-11-21', '2026-11-22')).toEqual({ kind: 'no_working_days' });
  });

  it('calendar type with limit 14 (paternity): 14 days ok, 15 → limit_exceeded', () => {
    const paternity: LeaveRequestCheckType = { deductsPool: false, yearlyLimit: 14, usedOfLimit: 0, dayCount: 'calendar', requiresApproval: true };
    expect(check('2026-11-23', '2026-12-06', paternity)).toMatchObject({ kind: 'ok', workingDays: 14 });
    expect(check('2026-11-23', '2026-12-07', paternity)).toEqual({ kind: 'limit_exceeded', limit: 14, used: 0, days: 15 });
  });

  it('calendar type deducting the pool takes calendar days (weekend too) from the pool', () => {
    const calendarVacation: LeaveRequestCheckType = { ...vacation, dayCount: 'calendar' };
    expect(check('2026-11-20', '2026-11-23', calendarVacation)).toEqual({ kind: 'ok', workingDays: 4, dayCount: 'calendar', fromCarried: 4, fromAnnual: 0, leftAfter: 26 });
    expect(check('2026-11-20', '2026-11-23', calendarVacation, { annualDays: 3, carriedDays: 0 })).toEqual({ kind: 'not_enough_days', days: 4, left: 3, pending: 0 });
  });

  it('backdated start in a closed year → year_closed (pool already 2027)', () => {
    expect(checkLeaveRequest({ type: sick, dateFrom: '2026-12-30', dateTo: '2027-01-03', today: '2027-01-02' }, { ...ctx, poolYear: 2027 })).toEqual({ kind: 'year_closed', year: 2026 });
  });

  it('earliestLeaveStart: today with approval, 7 days back without', () => {
    expect(earliestLeaveStart(vacation, '2026-11-17')).toBe('2026-11-17');
    expect(earliestLeaveStart(sick, '2026-11-17')).toBe('2026-11-10');
    expect(earliestLeaveStart(sick, '2026-03-03')).toBe('2026-02-24');
  });
});

describe('canWithdrawRequest', () => {
  const today = '2026-11-17';
  const req = (o: Partial<Parameters<typeof canWithdrawRequest>[0]>) => ({
    status: 'approved' as const, autoApproved: true, dateFrom: '2026-11-18', createdAt: '2026-11-10T08:00:00.000Z', ...o,
  });

  it('pending: always (as before)', () => {
    expect(canWithdrawRequest(req({ status: 'pending', autoApproved: false, dateFrom: '2026-11-01' }), today)).toBe(true);
  });

  it('auto-approved: until the first day (today included)', () => {
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-18' }), today)).toBe(true);
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-17' }), today)).toBe(true);
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-16' }), today)).toBe(false);
  });

  it('auto-approved filed today, starting in the past → yes; "today" in the app time zone (23:30 UTC is tomorrow in Warsaw)', () => {
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-12', createdAt: '2026-11-17T06:00:00.000Z' }), today)).toBe(true);
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-12', createdAt: '2026-11-16T23:30:00.000Z' }), today)).toBe(true);
    expect(canWithdrawRequest(req({ dateFrom: '2026-11-12', createdAt: '2026-11-16T22:30:00.000Z' }), today)).toBe(false);
  });

  it('approved by an administrator, rejected, withdrawn, cancelled → no', () => {
    expect(canWithdrawRequest(req({ autoApproved: false }), today)).toBe(false);
    for (const status of ['rejected', 'withdrawn', 'cancelled'] as const) {
      expect(canWithdrawRequest(req({ status }), today)).toBe(false);
    }
  });
});
