import type { TFunction } from 'i18next';
import { formatDate, type NotificationItem } from '@app/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tytuł i szczegóły powiadomienia z klucza rodzaju i zapisanych parametrów; daty RRRR-MM-DD jako DD.MM.RRRR. */
export const notificationTexts = (n: NotificationItem, t: TFunction<'notifications'>) => {
  const params = Object.fromEntries(
    Object.entries(n.params).map(([key, value]) => [key, typeof value === 'string' && ISO_DATE.test(value) ? (formatDate(value) ?? value) : value]),
  );
  const detailKey = n.type === 'task_assigned' && !n.params.dueDate ? 'detail_no_due' : 'detail';
  return {
    title: t(`types.${n.type}.title`, params),
    detail: t(`types.${n.type}.${detailKey}`, params),
  };
};
