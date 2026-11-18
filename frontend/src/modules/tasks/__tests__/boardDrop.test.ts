import type { BoardTask } from '@app/shared';
import { columnDropId, dragTarget, placementOf } from '../components/boardDrop';

const task = (id: number, column: BoardTask['column'], position: number): BoardTask => ({
  id, title: `Z${id}`, description: null, dueDate: null, column, position, completedAt: null, createdByName: 'A', createdAt: '2026-11-10T10:00:00.000Z', assigneeIds: [], leaves: [],
});
const tasks = [task(1, 'draft', 1), task(2, 'draft', 2), task(3, 'draft', 3), task(4, 'in_progress', 1)];

describe('boardDrop', () => {
  it('over a column: at the end of that column', () => {
    expect(dragTarget(tasks, 1, columnDropId('done'))).toEqual({ column: 'done', beforeTaskId: null });
  });

  it('down inside a column: after the card it is over', () => {
    expect(dragTarget(tasks, 1, 2)).toEqual({ column: 'draft', beforeTaskId: 3 });
    expect(dragTarget(tasks, 1, 3)).toEqual({ column: 'draft', beforeTaskId: null });
  });

  it('up inside a column and into another column: before the card it is over', () => {
    expect(dragTarget(tasks, 3, 1)).toEqual({ column: 'draft', beforeTaskId: 1 });
    expect(dragTarget(tasks, 2, 4)).toEqual({ column: 'in_progress', beforeTaskId: 4 });
  });

  it('over itself or unknown: no change', () => {
    expect(dragTarget(tasks, 2, 2)).toBeNull();
    expect(dragTarget(tasks, 2, 99)).toBeNull();
  });

  it('placementOf reads the column and the next card after a drag', () => {
    expect(placementOf(tasks, 2)).toEqual({ column: 'draft', beforeTaskId: 3 });
    expect(placementOf(tasks, 4)).toEqual({ column: 'in_progress', beforeTaskId: null });
  });
});
