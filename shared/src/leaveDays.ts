import type { i18n } from 'i18next';
import type { LeaveDayCount } from './constants/leaveTypes';

/**
 * Liczba dni wniosku z jednostką, np. „5 dni roboczych”, „7 dni kalendarzowych”. Jedno miejsce dla list, szczegółów,
 * okien, PDF i powiadomień. Bez sposobu liczenia (stare powiadomienia) = dni robocze.
 */
export const leaveDaysText = (t: i18n['t'], days: number, dayCount: LeaveDayCount = 'working'): string =>
  t(`leave_days.${dayCount}`, { ns: 'common', count: days }) as string;
