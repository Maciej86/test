import type { LeaveDayCount } from './constants/leaveTypes';
import { ISO_DATE_FORMAT } from './constants/dates';
import { dayjs } from './date';
import { isWorkingDay } from './holidays';

/** Kolejne dni od `from` (włącznie), `RRRR-MM-DD`. */
export const calendarDays = (from: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => dayjs(from).add(i, 'day').format(ISO_DATE_FORMAT));

/** Kawałek paska w kalendarzu: kolumny `start`–`end` (numery dni w zakresie, włącznie). */
export interface CalendarSegment {
  start: number;
  end: number;
  /** Przerwa w środku urlopu liczonego w dniach roboczych (weekend, święto): cienka linia zamiast paska. */
  bridge: boolean;
}

/**
 * Pasek nieobecności `from`–`to` w widocznych dniach `days`. Urlop w dniach kalendarzowych to jeden kawałek; w dniach
 * roboczych pęka na weekendy i święta (przerwy w środku to `bridge`, przerwa na brzegu zakresu znika). Część poza
 * zakresem jest ucinana.
 */
export const calendarSegments = (from: string, to: string, days: readonly string[], dayCount: LeaveDayCount): CalendarSegment[] => {
  const segments: CalendarSegment[] = [];
  days.forEach((iso, i) => {
    if (iso < from || iso > to) return;
    const bridge = dayCount === 'working' && !isWorkingDay(iso);
    const last = segments[segments.length - 1];
    if (last && last.end === i - 1 && last.bridge === bridge) last.end = i;
    else segments.push({ start: i, end: i, bridge });
  });
  while (segments[0]?.bridge) segments.shift();
  while (segments[segments.length - 1]?.bridge) segments.pop();
  return segments;
};
