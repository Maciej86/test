import dayjs from 'dayjs';
import { ISO_DATE_FORMAT } from './constants/dates';
import { todayIsoDate } from './date';
import type { TaskColumn } from './constants/tasks';

/**
 * Termin zadania: po czasie (`overdue`), dziś albo jutro (`soon`), później (`normal`); zrealizowane i bez terminu: null.
 * Ta sama reguła na karcie tablicy i na Pulpicie.
 */
export const taskDueState = (dueDate: string | null, column: TaskColumn, today: string = todayIsoDate()): 'overdue' | 'soon' | 'normal' | null => {
  if (!dueDate || column === 'done') return null;
  if (dueDate < today) return 'overdue';
  if (dueDate <= dayjs(today).add(1, 'day').format(ISO_DATE_FORMAT)) return 'soon';
  return 'normal';
};
