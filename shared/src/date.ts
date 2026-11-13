import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  APP_TIME_ZONE,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  ISO_DATE_FORMAT,
  TIME_FORMAT,
} from './constants/dates';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Jedyne miejsce, w którym aplikacja zamienia daty na tekst. Moduły nie używają `toLocaleDateString`,
 * `Intl.DateTimeFormat` ani własnego składania dni i miesięcy (pilnuje tego test `dates.test.ts`).
 *
 * Wartości:
 * - kolumna DATE przychodzi z bazy jako tekst `RRRR-MM-DD` (`dateStrings: ['DATE']` w puli) i nie ma strefy czasowej,
 * - DATETIME przychodzi jako `Date` (backend) albo tekst ISO z `Z` (front, po JSON) i pokazujemy ją w APP_TIME_ZONE.
 */
export type DateInput = string | Date | null | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDayjs(value: DateInput): Dayjs | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const day = dayjs(value, ISO_DATE_FORMAT, true);
    return day.isValid() ? day : null;
  }
  const moment = dayjs(value);
  return moment.isValid() ? moment.tz(APP_TIME_ZONE) : null;
}

/** `12.11.2026`; pusta lub błędna wartość → `null` (ekran pokazuje wtedy „brak”). */
export function formatDate(value: DateInput): string | null {
  return toDayjs(value)?.format(DATE_FORMAT) ?? null;
}

/** `12.11.2026 14:05` w strefie aplikacji. */
export function formatDateTime(value: DateInput): string | null {
  return toDayjs(value)?.format(DATE_TIME_FORMAT) ?? null;
}

/** `14:05` w strefie aplikacji. */
export function formatTime(value: DateInput): string | null {
  return toDayjs(value)?.format(TIME_FORMAT) ?? null;
}

/** Dzień w formacie bazy `RRRR-MM-DD` (do zapytań, porównań i API). */
export function toIsoDate(value: DateInput): string | null {
  return toDayjs(value)?.format(ISO_DATE_FORMAT) ?? null;
}

/** Dzisiejszy dzień w strefie aplikacji, `RRRR-MM-DD`. */
export function todayIsoDate(): string {
  return dayjs().tz(APP_TIME_ZONE).format(ISO_DATE_FORMAT);
}

export { dayjs };
