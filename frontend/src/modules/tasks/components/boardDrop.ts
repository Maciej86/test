import type { BoardTask, TaskColumn, TaskMoveInput } from '@app/shared';
import { columnTasks } from '../boardMove';

const COLUMN_PREFIX = 'column:';

/** Identyfikator kolumny jako miejsca upuszczenia (karty mają numery zadań). */
export const columnDropId = (column: TaskColumn): string => `${COLUMN_PREFIX}${column}`;

/**
 * Gdzie stanie przeciągana karta, gdy jest nad kartą `overId` albo nad kolumną: w dół w tej samej kolumnie za
 * kartą, w górę i w innej kolumnie przed nią, nad pustym miejscem kolumny na jej końcu. Bez zmiany: null.
 */
export const dragTarget = (tasks: BoardTask[], activeId: number, overId: number | string): TaskMoveInput | null => {
  if (typeof overId === 'string') {
    return overId.startsWith(COLUMN_PREFIX) ? { column: overId.slice(COLUMN_PREFIX.length) as TaskColumn, beforeTaskId: null } : null;
  }
  const active = tasks.find((t) => t.id === activeId);
  const over = tasks.find((t) => t.id === overId);
  if (!active || !over || active.id === over.id) return null;
  const list = columnTasks(tasks, over.column);
  const overIndex = list.findIndex((t) => t.id === over.id);
  if (active.column === over.column && list.findIndex((t) => t.id === active.id) < overIndex) {
    return { column: over.column, beforeTaskId: list[overIndex + 1]?.id ?? null };
  }
  return { column: over.column, beforeTaskId: over.id };
};

/** Miejsce karty na tablicy: kolumna i karta, która stoi za nią (dla serwera po upuszczeniu). */
export const placementOf = (tasks: BoardTask[], taskId: number): TaskMoveInput => {
  const task = tasks.find((t) => t.id === taskId)!;
  const list = columnTasks(tasks, task.column);
  return { column: task.column, beforeTaskId: list[list.findIndex((t) => t.id === taskId) + 1]?.id ?? null };
};
