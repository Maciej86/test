import type { BoardTask } from '@app/shared';
import { columnDropId, dragOverTarget, dropTarget, overColumn, placementOf, preferCards } from '../components/boardDrop';
import { moveInBoard } from '../boardMove';

const task = (id: number, column: BoardTask['column'], position: number): BoardTask => ({
  id, title: `Z${id}`, description: null, dueDate: null, column, position, completedAt: null, finishedAt: null, createdByName: 'A', createdAt: '2026-11-10T10:00:00.000Z', assigneeIds: [], leaves: [], commentCount: 0,
});
const tasks = [task(1, 'draft', 1), task(2, 'draft', 2), task(3, 'draft', 3), task(4, 'in_progress', 1)];

describe('boardDrop: while dragging (only a move to another column)', () => {
  it('over another column: at its end; over a card of another column: before that card', () => {
    expect(dragOverTarget(tasks, 1, columnDropId('done'))).toEqual({ column: 'done', beforeTaskId: null });
    expect(dragOverTarget(tasks, 2, 4)).toEqual({ column: 'in_progress', beforeTaskId: 4 });
  });

  it('inside its own column nothing changes while dragging (no back and forth)', () => {
    expect(dragOverTarget(tasks, 1, 2)).toBeNull();
    expect(dragOverTarget(tasks, 1, 3)).toBeNull();
    expect(dragOverTarget(tasks, 1, columnDropId('draft'))).toBeNull();
    expect(dragOverTarget(tasks, 2, 2)).toBeNull();
    expect(dragOverTarget(tasks, 2, 99)).toBeNull();
  });

  // Błąd z przeglądarki (2026-11-18): karta nad kolumną i nad kartą w niej skakała na zmianę „na koniec” i „przed
  // kartę”, bez końca („Maximum update depth exceeded”). Po pierwszym przeniesieniu do kolumny kolejne zdarzenia nie
  // zmieniają już tablicy.
  it('after the first move into a column, alternating over-events change nothing', () => {
    let board = tasks;
    const step = (over: number | string) => {
      const target = dragOverTarget(board, 1, over);
      if (target) board = moveInBoard(board, 1, target);
      return target;
    };
    expect(step(columnDropId('in_progress'))).not.toBeNull();
    for (let i = 0; i < 10; i++) {
      expect(step(4)).toBeNull();
      expect(step(columnDropId('in_progress'))).toBeNull();
    }
  });
});

describe('boardDrop: on drop (order inside the column)', () => {
  it('down inside a column: after the card it is over; up: before it', () => {
    expect(dropTarget(tasks, 1, 2)).toEqual({ column: 'draft', beforeTaskId: 3 });
    expect(dropTarget(tasks, 1, 3)).toEqual({ column: 'draft', beforeTaskId: null });
    expect(dropTarget(tasks, 3, 1)).toEqual({ column: 'draft', beforeTaskId: 1 });
  });

  it('over its own column or itself: stays where it is', () => {
    expect(dropTarget(tasks, 2, columnDropId('draft'))).toEqual(placementOf(tasks, 2));
    expect(dropTarget(tasks, 2, 2)).toEqual(placementOf(tasks, 2));
  });

  it('placementOf reads the column and the next card', () => {
    expect(placementOf(tasks, 2)).toEqual({ column: 'draft', beforeTaskId: 3 });
    expect(placementOf(tasks, 4)).toEqual({ column: 'in_progress', beforeTaskId: null });
  });
});

// Zgłoszenie 2026-11-18: karta wisiała już nad kartą w innej kolumnie, a ramka i miejsce się nie zmieniały, bo cel
// wybierało to, nad czym była większa część szerokiej karty. Teraz cel jest pod kursorem, karta przed kolumną.
describe('boardDrop: target under the pointer', () => {
  it('preferCards puts cards before columns, keeping their order', () => {
    const c = (id: number | string) => ({ id, data: undefined });
    expect(preferCards([c(columnDropId('draft')), c(1), c(columnDropId('done')), c(2)]).map((x) => x.id)).toEqual([1, 2, columnDropId('draft'), columnDropId('done')]);
  });

  it('overColumn: the column of the card or the column itself, unknown → null', () => {
    expect(overColumn(tasks, 4)).toBe('in_progress');
    expect(overColumn(tasks, columnDropId('done'))).toBe('done');
    expect(overColumn(tasks, 99)).toBeNull();
  });
});
