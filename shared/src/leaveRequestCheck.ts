import type { LeaveDayCount } from './constants/leaveTypes';
import { ISO_DATE_FORMAT } from './constants/dates';
import { NO_APPROVAL_BACKDATE_DAYS, type LeaveRequestStatus } from './constants/myLeave';
import { dayjs, toIsoDate } from './date';
import { countWorkingDays } from './holidays';
import type { LeaveBusyRange } from './schemas/myLeave';

/** Zasady typu urlopu potrzebne do sprawdzenia wniosku. */
export interface LeaveRequestCheckType {
  deductsPool: boolean;
  yearlyLimit: number | null;
  /** Dni czekające i zatwierdzone tego typu w roku otwartym. */
  usedOfLimit: number;
  /** Jak liczyć dni wniosku i czy wniosek czeka na decyzję (bez zatwierdzania: można zacząć do 7 dni wstecz). */
  dayCount: LeaveDayCount;
  requiresApproval: boolean;
}

/** Pula roku otwartego tej osoby i jej zajęte terminy. */
export interface LeaveRequestCheckContext {
  poolYear: number;
  annualDays: number;
  carriedDays: number;
  /** Zatwierdzone dni z zaległego i z puli rocznej. */
  usedCarried: number;
  usedAnnual: number;
  /** Dni z wniosków czekających (zarezerwowane). */
  pendingCarried: number;
  pendingAnnual: number;
  busy: LeaveBusyRange[];
}

export type LeaveRequestCheck =
  | { kind: 'ok'; workingDays: number; dayCount: LeaveDayCount; fromCarried: number; fromAnnual: number; leftAfter: number | null }
  | { kind: 'past_date' }
  | { kind: 'pool_not_ready'; year: number; openYear: number }
  | { kind: 'year_closed'; year: number }
  | { kind: 'overlap'; other: LeaveBusyRange }
  | { kind: 'no_working_days' }
  | { kind: 'limit_exceeded'; limit: number; used: number; days: number }
  | { kind: 'not_enough_days'; days: number; left: number; pending: number };

/** Najwcześniejsza data „Od”: dziś, a dla typu bez zatwierdzania (np. chorobowe) do 7 dni wstecz. */
export const earliestLeaveStart = (type: Pick<LeaveRequestCheckType, 'requiresApproval'>, today: string): string =>
  type.requiresApproval ? today : dayjs(today).subtract(NO_APPROVAL_BACKDATE_DAYS, 'day').format(ISO_DATE_FORMAT);

/** Dni wniosku: robocze (bez weekendów i świąt) albo wszystkie od–do. */
const countRequestDays = (dateFrom: string, dateTo: string, dayCount: LeaveDayCount): number =>
  dayCount === 'calendar' ? dayjs(dateTo).diff(dayjs(dateFrom), 'day') + 1 : countWorkingDays(dateFrom, dateTo);

/**
 * Sprawdzenie wniosku: ile dni (roboczych albo kalendarzowych, według typu), skąd się wezmą (najpierw zaległe) albo
 * co blokuje złożenie. Tę samą funkcję woła serwer przy złożeniu (pod blokadą puli) i okno „Złóż wniosek” na bieżąco, więc wynik jest ten sam.
 * Daty `RRRR-MM-DD`, „Do” ≥ „Od” (pilnuje schemat). Kolejność: przeszłość, rok, nakładanie, dni robocze, limit, pula.
 */
export const checkLeaveRequest = (
  input: { type: LeaveRequestCheckType; dateFrom: string; dateTo: string; today: string },
  ctx: LeaveRequestCheckContext,
): LeaveRequestCheck => {
  const { type, dateFrom, dateTo } = input;
  if (dateFrom < earliestLeaveStart(type, input.today)) return { kind: 'past_date' };

  const yearTo = Number(dateTo.slice(0, 4));
  const yearFrom = Number(dateFrom.slice(0, 4));
  if (yearTo > ctx.poolYear) return { kind: 'pool_not_ready', year: yearTo, openYear: ctx.poolYear };
  if (yearFrom < ctx.poolYear) return { kind: 'year_closed', year: yearFrom };

  const other = ctx.busy.find((b) => b.dateFrom <= dateTo && b.dateTo >= dateFrom);
  if (other) return { kind: 'overlap', other };

  const days = countRequestDays(dateFrom, dateTo, type.dayCount);
  if (days === 0) return { kind: 'no_working_days' };

  if (type.yearlyLimit !== null && type.usedOfLimit + days > type.yearlyLimit) {
    return { kind: 'limit_exceeded', limit: type.yearlyLimit, used: type.usedOfLimit, days };
  }
  if (!type.deductsPool) return { kind: 'ok', workingDays: days, dayCount: type.dayCount, fromCarried: 0, fromAnnual: 0, leftAfter: null };

  const pending = ctx.pendingCarried + ctx.pendingAnnual;
  const left = Math.max(0, ctx.annualDays + ctx.carriedDays - ctx.usedCarried - ctx.usedAnnual - pending);
  if (days > left) return { kind: 'not_enough_days', days, left, pending };
  const carriedLeft = Math.max(0, ctx.carriedDays - ctx.usedCarried - ctx.pendingCarried);
  const fromCarried = Math.min(days, carriedLeft);
  return { kind: 'ok', workingDays: days, dayCount: type.dayCount, fromCarried, fromAnnual: days - fromCarried, leftAfter: left - days };
};

/**
 * Czy pracownik może sam wycofać wniosek: czekający zawsze; zatwierdzony automatycznie (typ bez zatwierdzania)
 * do pierwszego dnia włącznie albo w dniu złożenia (pomyłka przy chorobowym wpisanym wstecz). Zatwierdzony przez
 * administratora i rozpatrzone: nie (zatwierdzony anuluje administrator). „Dziś” w strefie aplikacji.
 */
export const canWithdrawRequest = (
  r: { status: LeaveRequestStatus; autoApproved: boolean; dateFrom: string; createdAt: string | Date },
  today: string,
): boolean => {
  if (r.status === 'pending') return true;
  if (r.status !== 'approved' || !r.autoApproved) return false;
  return r.dateFrom >= today || toIsoDate(r.createdAt) === today;
};
