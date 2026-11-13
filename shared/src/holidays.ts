import { dayjs, toIsoDate, type DateInput } from './date';
import { ISO_DATE_FORMAT } from './constants/dates';

/**
 * Polskie święta ustawowo wolne od pracy. Jedna funkcja dla backendu, frontu i makiet, żeby wszędzie wychodziła
 * ta sama liczba dni roboczych (np. dni urlopu). Daty zawsze jako tekst `RRRR-MM-DD`.
 *
 * Nowe albo zniesione święto = jeden wpis w FIXED_HOLIDAYS z `fromYear` / `toYear` (np. Wigilia wolna od 2025).
 * Święto w sobotę nie jest tu liczone; moduł urlopów lub czasu pracy pyta w makiecie, co firma wtedy robi.
 */
export type HolidayKey =
  | 'new_year'
  | 'epiphany'
  | 'easter_sunday'
  | 'easter_monday'
  | 'labour_day'
  | 'constitution_day'
  | 'pentecost'
  | 'corpus_christi'
  | 'assumption'
  | 'all_saints'
  | 'independence_day'
  | 'christmas_eve'
  | 'christmas_day'
  | 'second_christmas_day';

export interface Holiday {
  date: string;
  key: HolidayKey;
  /** Klucz tekstu do `translateKey`, np. `common.holidays.new_year`. */
  label: string;
}

interface FixedHoliday {
  month: number;
  day: number;
  key: HolidayKey;
  fromYear?: number;
  toYear?: number;
}

export const FIXED_HOLIDAYS: readonly FixedHoliday[] = [
  { month: 1, day: 1, key: 'new_year' },
  { month: 1, day: 6, key: 'epiphany', fromYear: 2011 },
  { month: 5, day: 1, key: 'labour_day' },
  { month: 5, day: 3, key: 'constitution_day' },
  { month: 8, day: 15, key: 'assumption' },
  { month: 11, day: 1, key: 'all_saints' },
  { month: 11, day: 11, key: 'independence_day' },
  { month: 12, day: 24, key: 'christmas_eve', fromYear: 2025 },
  { month: 12, day: 25, key: 'christmas_day' },
  { month: 12, day: 26, key: 'second_christmas_day' },
];

/** Dni po Wielkanocy dla świąt ruchomych. */
const MOVABLE_HOLIDAYS: readonly { offset: number; key: HolidayKey }[] = [
  { offset: 0, key: 'easter_sunday' },
  { offset: 1, key: 'easter_monday' },
  { offset: 49, key: 'pentecost' },
  { offset: 60, key: 'corpus_christi' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Niedziela Wielkanocna (algorytm Meeusa/Jonesa/Butchera), `RRRR-MM-DD`. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const cache = new Map<number, Holiday[]>();

/** Wszystkie święta w roku, posortowane po dacie. */
export function getPolishHolidays(year: number): Holiday[] {
  const cached = cache.get(year);
  if (cached) return cached;
  const easter = dayjs(easterSunday(year), ISO_DATE_FORMAT);
  const fixed = FIXED_HOLIDAYS.filter(
    (h) => (h.fromYear === undefined || year >= h.fromYear) && (h.toYear === undefined || year <= h.toYear),
  ).map((h) => ({ date: `${year}-${pad(h.month)}-${pad(h.day)}`, key: h.key }));
  const movable = MOVABLE_HOLIDAYS.map((h) => ({
    date: easter.add(h.offset, 'day').format(ISO_DATE_FORMAT),
    key: h.key,
  }));
  const result = [...fixed, ...movable]
    .map((h) => ({ ...h, label: `common.holidays.${h.key}` }))
    .sort((x, y) => x.date.localeCompare(y.date));
  cache.set(year, result);
  return result;
}

/** Święto w danym dniu albo `null`. */
export function getHoliday(value: DateInput): Holiday | null {
  const date = toIsoDate(value);
  if (!date) return null;
  return getPolishHolidays(Number(date.slice(0, 4))).find((h) => h.date === date) ?? null;
}

export function isHoliday(value: DateInput): boolean {
  return getHoliday(value) !== null;
}

export function isWeekend(value: DateInput): boolean {
  const date = toIsoDate(value);
  if (!date) return false;
  const weekday = dayjs(date, ISO_DATE_FORMAT).day();
  return weekday === 0 || weekday === 6;
}

/**
 * Dni wolne ustalone przez firmę (np. dzień za święto w sobotę, wigilia firmowa), `RRRR-MM-DD`. Pochodzą z tabeli,
 * którą prowadzi administrator; przekaż je do isWorkingDay / countWorkingDays.
 */
export type ExtraDaysOff = ReadonlySet<string> | readonly string[];

function isExtraDayOff(date: string, extra?: ExtraDaysOff): boolean {
  if (!extra) return false;
  return 'has' in extra ? extra.has(date) : extra.includes(date);
}

/** Dzień roboczy: nie sobota, nie niedziela, nie święto, nie dodatkowy dzień wolny firmy. */
export function isWorkingDay(value: DateInput, extraDaysOff?: ExtraDaysOff): boolean {
  const date = toIsoDate(value);
  return date !== null && !isWeekend(date) && !isHoliday(date) && !isExtraDayOff(date, extraDaysOff);
}

/** Liczba dni roboczych od `from` do `to` włącznie (0, gdy `to` jest przed `from`). */
export function countWorkingDays(from: DateInput, to: DateInput, extraDaysOff?: ExtraDaysOff): number {
  const start = toIsoDate(from);
  const end = toIsoDate(to);
  if (!start || !end) return 0;
  let day = dayjs(start, ISO_DATE_FORMAT);
  const last = dayjs(end, ISO_DATE_FORMAT);
  let count = 0;
  while (!day.isAfter(last, 'day')) {
    if (isWorkingDay(day.format(ISO_DATE_FORMAT), extraDaysOff)) count += 1;
    day = day.add(1, 'day');
  }
  return count;
}
