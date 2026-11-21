import type { TFunction } from 'i18next';
import { LEAVE_DAY_COUNTS, formatDate, leaveDaysText, type LeaveDayCount, type NotificationItem } from '@app/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isDayCount = (value: unknown): value is LeaveDayCount => LEAVE_DAY_COUNTS.includes(value as LeaveDayCount);

/**
 * Tytuł i szczegóły powiadomienia z klucza rodzaju i zapisanych parametrów; daty RRRR-MM-DD jako DD.MM.RRRR, liczba dni
 * wniosku z jednostką (`daysText`; stare powiadomienia bez `dayCount` = dni robocze).
 */
export const notificationTexts = (n: NotificationItem, t: TFunction<'notifications'>) => {
  const params: Record<string, unknown> = Object.fromEntries(
    Object.entries(n.params).map(([key, value]) => [key, typeof value === 'string' && ISO_DATE.test(value) ? (formatDate(value) ?? value) : value]),
  );
  if (typeof n.params.days === 'number') {
    params.daysText = leaveDaysText(t, n.params.days, isDayCount(n.params.dayCount) ? n.params.dayCount : 'working');
  }
  const detailKey = n.type === 'task_assigned' && !n.params.dueDate ? 'detail_no_due' : 'detail';
  return {
    title: t(`types.${n.type}.title`, params),
    detail: t(`types.${n.type}.${detailKey}`, params),
  };
};
