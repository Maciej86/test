import { z } from 'zod';
import {
  LEAVE_REQUEST_COMMENT_MAX,
  LEAVE_REQUEST_YEAR_MAX,
  LEAVE_REQUEST_YEAR_MIN,
  MY_LEAVE_MESSAGES as M,
  type LeaveRequestStatus,
} from '../constants/myLeave';
import { isoDate, optionalField, text, wholeNumber } from './fields';

/** Największy numer w kolumnie INT UNSIGNED, którą zna formularz (ochrona przed ogromnymi liczbami). */
const LEAVE_TYPE_ID_MAX = 2_147_483_647;

/**
 * Okno „Złóż wniosek” (POST /api/my-leave/requests). Dni robocze, podział i status liczy serwer; „Od” przed dziś też
 * sprawdza serwer (jego „dziś”). Schemat pilnuje kolejności dat i jednego roku (urlop na przełomie lat = dwa wnioski).
 */
export const leaveRequestSchema = z
  .object({
    // Select w formularzu daje tekst „3”, API liczbę 3; istnienie i widoczność typu sprawdza serwer.
    leaveTypeId: wholeNumber(1, LEAVE_TYPE_ID_MAX),
    dateFrom: isoDate,
    dateTo: isoDate,
    comment: optionalField(text(LEAVE_REQUEST_COMMENT_MAX)),
  })
  .superRefine((v, ctx) => {
    if (v.dateTo < v.dateFrom) ctx.addIssue({ code: 'custom', path: ['dateTo'], message: M.datesOrder });
    else if (v.dateTo.slice(0, 4) !== v.dateFrom.slice(0, 4)) ctx.addIssue({ code: 'custom', path: ['dateTo'], message: M.sameYear });
  });

/** Rok listy wniosków z adresu (`?year=2025`); brak = rok otwarty. */
export const myLeaveRequestsQuerySchema = z.object({
  year: z.coerce.number().int().min(LEAVE_REQUEST_YEAR_MIN).max(LEAVE_REQUEST_YEAR_MAX).optional(),
});

export type LeaveRequestInput = z.input<typeof leaveRequestSchema>;
export type LeaveRequestData = z.output<typeof leaveRequestSchema>;
export type MyLeaveRequestsQuery = z.output<typeof myLeaveRequestsQuerySchema>;

/** Własny wniosek czekający albo zatwierdzony: zajmuje termin (nowy nie może na niego zachodzić). */
export interface LeaveBusyRange {
  dateFrom: string;
  dateTo: string;
  leaveTypeName: string;
  status: LeaveRequestStatus;
}

/** Ekran „Moje urlopy”: pula roku otwartego, typy z zajętą częścią limitu, lata z wnioskami, zajęte terminy. */
export interface MyLeaveOverview {
  pool: {
    year: number;
    annualDays: number;
    carriedDays: number;
    /** Zatwierdzone dni z zaległego i z puli rocznej. */
    usedCarried: number;
    usedAnnual: number;
    /** Dni z wniosków czekających: razem i z zaległego. */
    pendingDays: number;
    pendingCarried: number;
    /** Dni, o które pracownik może jeszcze wnioskować (czekające odjęte). */
    leftDays: number;
    /** Z tego zaległe. */
    leftCarriedDays: number;
  };
  /** Widoczne typy w kolejności; `usedOfLimit` = dni czekające i zatwierdzone tego typu w roku otwartym. */
  types: { id: number; name: string; deductsPool: boolean; yearlyLimit: number | null; usedOfLimit: number }[];
  /** Lata z wnioskami i rok otwarty, od najnowszego. */
  years: number[];
  busy: LeaveBusyRange[];
}

export interface MyLeaveRequest {
  id: number;
  leaveTypeName: string;
  deductsPool: boolean;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
  status: LeaveRequestStatus;
  decisionReason: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface MyLeaveRequestsResponse {
  year: number;
  items: MyLeaveRequest[];
}
