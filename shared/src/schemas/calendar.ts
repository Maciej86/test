import { z } from 'zod';
import { CALENDAR_FROM_MAX, CALENDAR_FROM_MIN } from '../constants/calendar';
import type { LeaveDayCount, LeaveTypeColor } from '../constants/leaveTypes';
import { isoDate, optionalField } from './fields';

const M = { min: 'validation.min', max: 'validation.max' } as const;

/** `GET /api/calendar?from=RRRR-MM-DD`; brak `from` = dziś (liczy serwer). Koniec zakresu zawsze liczy serwer. */
export const calendarQuerySchema = z.object({
  from: optionalField(isoDate.refine((d) => d >= CALENDAR_FROM_MIN, M.min).refine((d) => d <= CALENDAR_FROM_MAX, M.max)),
});

export type CalendarQuery = z.output<typeof calendarQuerySchema>;

/** Wiersz kalendarza: aktywny pracownik. */
export interface CalendarPerson {
  id: number;
  name: string;
}

/** Wniosek czekający albo zatwierdzony, który ma choć jeden dzień w zakresie. */
export interface CalendarAbsence {
  id: number;
  userId: number;
  leaveTypeName: string;
  color: LeaveTypeColor;
  status: 'pending' | 'approved';
  dateFrom: string;
  dateTo: string;
  /** Dni wniosku liczone sposobem zapamiętanym we wniosku (`dayCount`). */
  days: number;
  dayCount: LeaveDayCount;
}

export interface CalendarResponse {
  from: string;
  to: string;
  today: string;
  people: CalendarPerson[];
  absences: CalendarAbsence[];
  /** Nieobecni dziś (do zdania „Dziś nie ma”), niezależnie od widocznego zakresu. */
  todayOff: CalendarAbsence[];
}
