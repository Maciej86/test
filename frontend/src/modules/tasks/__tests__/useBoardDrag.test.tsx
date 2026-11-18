import { act, renderHook } from '@testing-library/react';
import type { BoardTask } from '@app/shared';
import { columnDropId } from '../components/boardDrop';
import { useBoardDrag } from '../components/useBoardDrag';

const task = (id: number, column: BoardTask['column'], position: number): BoardTask => ({
  id, title: `Z${id}`, description: null, dueDate: null, column, position, completedAt: null, finishedAt: null, createdByName: 'A', createdAt: '2026-11-10T10:00:00.000Z', assigneeIds: [], leaves: [],
});
const before = [task(1, 'draft', 1), task(2, 'in_progress', 1)];
const event = (over: number | string | null) => ({ active: { id: 1 }, over: over === null ? null : { id: over } }) as never;

// Zgłoszenie 2026-11-18: po upuszczeniu karta na chwilę wracała do starej kolumny (tam leciał „duch”), a dopiero
// potem pojawiała się w nowej. Po upuszczeniu zostaje nowe ułożenie, dopóki nie przyjdą nowe dane tablicy.
describe('useBoardDrag', () => {
  it('after the drop the card stays in the new column until the board data changes', () => {
    const onMove = vi.fn();
    const { result, rerender } = renderHook(({ tasks }) => useBoardDrag(tasks, onMove), { initialProps: { tasks: before } });
    act(() => result.current.context.onDragStart(event(null)));
    act(() => result.current.context.onDragOver(event(columnDropId('in_progress'))));
    act(() => result.current.context.onDragEnd(event(columnDropId('in_progress'))));
    expect(onMove).toHaveBeenCalledWith(before[0], 'in_progress', null);
    expect(result.current.tasks.find((t) => t.id === 1)!.column).toBe('in_progress');
    rerender({ tasks: before });
    expect(result.current.tasks.find((t) => t.id === 1)!.column).toBe('in_progress');
    const after = [task(1, 'in_progress', 2), task(2, 'in_progress', 1)];
    rerender({ tasks: after });
    expect(result.current.tasks).toBe(after);
  });

  it('a drop without a change goes straight back to the board data', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useBoardDrag(before, onMove));
    act(() => result.current.context.onDragStart(event(null)));
    act(() => result.current.context.onDragEnd(event(columnDropId('draft'))));
    expect(onMove).not.toHaveBeenCalled();
    expect(result.current.tasks).toBe(before);
  });

  it('when the server refuses the move, reset brings back the board data', () => {
    const { result } = renderHook(() => useBoardDrag(before, vi.fn()));
    act(() => result.current.context.onDragStart(event(null)));
    act(() => result.current.context.onDragOver(event(columnDropId('done'))));
    act(() => result.current.context.onDragEnd(event(columnDropId('done'))));
    expect(result.current.tasks.find((t) => t.id === 1)!.column).toBe('done');
    act(() => result.current.reset());
    expect(result.current.tasks).toBe(before);
  });
});
