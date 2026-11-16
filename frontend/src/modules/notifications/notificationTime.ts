import type { TFunction } from 'i18next';
import { formatDate, formatDateTime, formatTime } from '@app/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dzień względem `now`: 0 = dziś, 1 = wczoraj, null = wcześniej. Porównanie dni w strefie Warszawy (formatDate). */
const daysAgo = (iso: string, now: Date): 0 | 1 | null => {
  const day = formatDate(iso);
  if (day === formatDate(now)) return 0;
  if (day === formatDate(new Date(now.getTime() - DAY_MS))) return 1;
  return null;
};

/** Czas przy powiadomieniu w dzwonku: „dzisiaj, 14:32”, „wczoraj, 09:10”, starsze „12.11.2026 11:08”. */
export const whenLabel = (iso: string, now: Date, t: TFunction<'notifications'>): string => {
  const ago = daysAgo(iso, now);
  const time = formatTime(iso) ?? '';
  if (ago === 0) return t('today_at', { time });
  if (ago === 1) return t('yesterday_at', { time });
  return formatDateTime(iso) ?? '';
};

/** Nagłówek grupy na stronie „Powiadomienia”: „Dzisiaj”, „Wczoraj” albo data. */
export const dayLabel = (iso: string, now: Date, t: TFunction<'notifications'>): string => {
  const ago = daysAgo(iso, now);
  if (ago === 0) return t('today');
  if (ago === 1) return t('yesterday');
  return formatDate(iso) ?? '';
};
