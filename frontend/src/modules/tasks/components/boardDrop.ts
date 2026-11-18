import type { BoardTask, TaskColumn, TaskMoveInput } from '@app/shared';
import { columnTasks } from '../boardMove';

const COLUMN_PREFIX = 'column:';

/** Identyfikator kolumny jako miejsca upuszczenia (karty mają numery zadań). */
export const columnDropId = (column: TaskColumn): string => `${COLUMN_PREFIX}${column}`;

const overColumn = (tasks: BoardTask[], overId: number | string): TaskColumn | null => {
  if (typeof overId === 'string') return overId.startsWith(COLUMN_PREFIX) ? (overId.slice(COLUMN_PREFIX.length) as TaskColumn) : null;
  return tasks.find((t) => t.id === overId)?.column ?? null;
};

/**
 * W trakcie przeciągania karta przeskakuje tylko do innej kolumny: nad kolumną na jej koniec, nad kartą przed nią.
 * We własnej kolumnie nic się nie zmienia (kolejność pokazuje przesunięcie kart, a ustala ją `dropTarget`), więc
 * karta nie skacze w tę i z powrotem między „na koniec” a „przed kartę”. Bez zmiany: null.
 */
export const dragOverTarget = (tasks: BoardTask[], activeId: number, overId: number | string): TaskMoveInput | null => {
  const active = tasks.find((t) => t.id === activeId);
  const column = overColumn(tasks, overId);
  if (!active || !column || column === active.column) return null;
  return { column, beforeTaskId: typeof overId === 'number' ? overId : null };
};

/**
 * Miejsce po upuszczeniu: nad kartą tej samej kolumny w dół za nią, w górę przed nią; nad własną kolumną albo
 * samą sobą zostaje tam, gdzie jest (także po przeskoku do innej kolumny w trakcie przeciągania).
 */
export const dropTarget = (tasks: BoardTask[], activeId: number, overId: number | string): TaskMoveInput => {
  const active = tasks.find((t) => t.id === activeId)!;
  const over = typeof overId === 'number' ? tasks.find((t) => t.id === overId) : undefined;
  if (!over || over.id === active.id || over.column !== active.column) return placementOf(tasks, activeId);
  const list = columnTasks(tasks, over.column);
  const overIndex = list.findIndex((t) => t.id === over.id);
  if (list.findIndex((t) => t.id === active.id) < overIndex) return { column: over.column, beforeTaskId: list[overIndex + 1]?.id ?? null };
  return { column: over.column, beforeTaskId: over.id };
};

/** Miejsce karty na tablicy: kolumna i karta, która stoi za nią (dla serwera po upuszczeniu). */
export const placementOf = (tasks: BoardTask[], taskId: number): TaskMoveInput => {
  const task = tasks.find((t) => t.id === taskId)!;
  const list = columnTasks(tasks, task.column);
  return { column: task.column, beforeTaskId: list[list.findIndex((t) => t.id === taskId) + 1]?.id ?? null };
};
