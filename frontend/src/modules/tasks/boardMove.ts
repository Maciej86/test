import { TASK_COLUMNS, type BoardTask, type TaskMoveInput } from '@app/shared';

/** Karty kolumny w kolejności. */
export const columnTasks = (tasks: BoardTask[], column: BoardTask['column']): BoardTask[] =>
  tasks.filter((t) => t.column === column).sort((a, b) => a.position - b.position);

/**
 * Tablica po przeniesieniu karty (tak samo jak liczy serwer): przed `beforeTaskId` w kolumnie docelowej albo na jej
 * koniec; pozycje w obu kolumnach od 1. Do natychmiastowej zmiany na ekranie, zanim odpowie serwer.
 */
export const moveInBoard = (tasks: BoardTask[], taskId: number, move: TaskMoveInput): BoardTask[] => {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;
  const result: BoardTask[] = [];
  for (const column of TASK_COLUMNS) {
    let list = columnTasks(tasks, column).filter((t) => t.id !== taskId);
    if (column === move.column) {
      const index = move.beforeTaskId === null ? -1 : list.findIndex((t) => t.id === move.beforeTaskId);
      const moved = { ...moving, column };
      list = index === -1 ? [...list, moved] : [...list.slice(0, index), moved, ...list.slice(index)];
    }
    result.push(...list.map((t, i) => ({ ...t, position: i + 1 })));
  }
  return result;
};
