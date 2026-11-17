import { describe, expect, it } from 'vitest';
import { checkLeaveRequest, type LeaveRequestCheckContext, type LeaveRequestCheckType } from '../leaveRequestCheck';

const vacation: LeaveRequestCheckType = { deductsPool: true, yearlyLimit: null, usedOfLimit: 0 };
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
    expect(check('2026-12-21', '2026-12-31')).toEqual({ kind: 'ok', workingDays: 7, fromCarried: 4, fromAnnual: 3, leftAfter: 23 });
    // 1 zaległy zatwierdzony i 1 czekający: zostały 2 zaległe.
    expect(check('2026-12-21', '2026-12-31', vacation, { usedCarried: 1, pendingCarried: 1, pendingAnnual: 2 })).toEqual({
      kind: 'ok', workingDays: 7, fromCarried: 2, fromAnnual: 5, leftAfter: 19,
    });
  });

  it('type that does not deduct → 0 / 0 and leftAfter null, even with an empty pool', () => {
    expect(check('2026-12-21', '2026-12-21', { ...vacation, deductsPool: false }, { annualDays: 0, carriedDays: 0 })).toEqual({
      kind: 'ok', workingDays: 1, fromCarried: 0, fromAnnual: 0, leftAfter: null,
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
    const onDemand = { deductsPool: true, yearlyLimit: 4, usedOfLimit: 1 };
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
