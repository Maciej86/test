import dayjs, { type Dayjs } from 'dayjs';
import type { TFunction } from 'i18next';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/pl';
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

const toDayjs = (value: DateInput): Dayjs | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const day = dayjs(value, ISO_DATE_FORMAT, true);
    return day.isValid() ? day : null;
  }
  const moment = dayjs(value);
  return moment.isValid() ? moment.tz(APP_TIME_ZONE) : null;
};

/** `12.11.2026`; pusta lub błędna wartość → `null` (ekran pokazuje wtedy „brak”). */
export const formatDate = (value: DateInput): string | null => {
  return toDayjs(value)?.format(DATE_FORMAT) ?? null;
};

/** `12.11.2026 14:05` w strefie aplikacji. */
export const formatDateTime = (value: DateInput): string | null => {
  return toDayjs(value)?.format(DATE_TIME_FORMAT) ?? null;
};

/** `14:05` w strefie aplikacji. */
export const formatTime = (value: DateInput): string | null => {
  return toDayjs(value)?.format(TIME_FORMAT) ?? null;
};

/** Dzień w formacie bazy `RRRR-MM-DD` (do zapytań, porównań i API). */
export const toIsoDate = (value: DateInput): string | null => {
  return toDayjs(value)?.format(ISO_DATE_FORMAT) ?? null;
};

/** Dzisiejszy dzień w strefie aplikacji, `RRRR-MM-DD`. */
export const todayIsoDate = (): string => {
  return dayjs().tz(APP_TIME_ZONE).format(ISO_DATE_FORMAT);
};

/** Data wpisana ręcznie w polu daty: `01.03.2024` albo `1.3.2024` → `2024-03-01`; inna lub nieistniejąca → null. */
export const parseTypedDate = (text: string): string | null => {
  const parts = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!parts) return null;
  const [, d, m, y] = parts;
  const day = dayjs(`${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`, ISO_DATE_FORMAT, true);
  return day.isValid() ? day.format(ISO_DATE_FORMAT) : null;
};

/** Części daty do dużego zapisu (ekran logowania): `piątek`, `14`, `listopada 2026`, `piątek, 14 listopada 2026`. */
export const formatDateParts = (
  value: DateInput,
): { weekday: string; day: string; monthYear: string; full: string } | null => {
  const day = toDayjs(value)?.locale('pl');
  if (!day) return null;
  // „D MMMM” daje miesiąc w dopełniaczu („14 listopada”), samo „MMMM” w mianowniku („listopad”).
  const dayMonthYear = day.format('D MMMM YYYY');
  return {
    weekday: day.format('dddd'),
    day: day.format('D'),
    monthYear: dayMonthYear.slice(dayMonthYear.indexOf(' ') + 1),
    full: `${day.format('dddd')}, ${dayMonthYear}`,
  };
};

/** Ile dni kalendarzowych (w strefie aplikacji) minęło od `value` do `now`: 0 = dziś, 1 = wczoraj, inaczej null. */
const calendarDaysAgo = (value: DateInput, now: Date): 0 | 1 | null => {
  const day = toDayjs(value)?.format(ISO_DATE_FORMAT);
  if (!day) return null;
  const today = dayjs(now).tz(APP_TIME_ZONE).startOf('day');
  if (day === today.format(ISO_DATE_FORMAT)) return 0;
  if (day === today.subtract(1, 'day').format(ISO_DATE_FORMAT)) return 1;
  return null;
};

/**
 * Godzina względna: „dzisiaj, 14:32”, „wczoraj, 23:50”, starsze `12.11.2026 11:08`. Dni liczone po kalendarzu
 * w strefie aplikacji (nie „teraz − 24 h”), więc zmiana czasu ani północ ich nie mylą. Teksty z `common.date`.
 */
export const formatRelativeDateTime = (value: DateInput, t: TFunction, now: Date = new Date()): string | null => {
  const time = formatTime(value);
  if (time === null) return null;
  const ago = calendarDaysAgo(value, now);
  if (ago === 0) return t('date.today_at', { ns: 'common', time });
  if (ago === 1) return t('date.yesterday_at', { ns: 'common', time });
  return formatDateTime(value);
};

/** Dzień względny, np. nagłówek grupy na liście: „Dzisiaj”, „Wczoraj” albo `12.11.2026`. */
export const formatRelativeDay = (value: DateInput, t: TFunction, now: Date = new Date()): string | null => {
  const ago = calendarDaysAgo(value, now);
  if (ago === 0) return t('date.today', { ns: 'common' });
  if (ago === 1) return t('date.yesterday', { ns: 'common' });
  return formatDate(value);
};

export { dayjs };
