import { dayjs, formatDate, todayIsoDate, ISO_DATE_FORMAT, type BoardTask } from '@app/shared';

/** Termin na karcie: po czasie, dziś albo jutro (`soon`), później; zrealizowane i bez terminu: null. */
export const dueState = (task: BoardTask): 'overdue' | 'soon' | 'normal' | null => {
  if (!task.dueDate || task.column === 'done') return null;
  const today = todayIsoDate();
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate <= dayjs(today).add(1, 'day').format(ISO_DATE_FORMAT)) return 'soon';
  return 'normal';
};

/** Zakres urlopu krótko: „23.11–27.11.2026”. */
export const leaveRange = (from: string, to: string) => ({ from: formatDate(from)!.slice(0, 5), to: formatDate(to)! });
