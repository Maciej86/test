import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { BoardResponse, BoardTask } from '@app/shared';
import { api } from '../../../core/api/client';
import {
  boardKey,
  useArchiveTask,
  useBoard,
  useDeleteProject,
  useMoveProject,
  useMoveTask,
  useProjectCandidates,
  useProjects,
  useSaveProject,
  useSaveTask,
} from '../tasks.api';
import { moveInBoard } from '../boardMove';

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, wrapper, invalidate };
};

const task = (id: number, column: BoardTask['column'], position: number): BoardTask => ({
  id, title: `Zadanie ${id}`, description: null, dueDate: null, column, position, completedAt: null, createdByName: 'Anna Nowak',
  createdAt: '2026-11-10T10:00:00.000Z', assigneeIds: [], leaves: [],
});
const board = (): BoardResponse => ({
  project: { id: 9, name: 'Marketing' }, people: [], oldDoneCount: 0, leaves: [],
  tasks: [task(1, 'draft', 1), task(2, 'draft', 2), task(3, 'in_progress', 1)],
});

afterEach(() => vi.restoreAllMocks());

describe('tasks api', () => {
  it('useProjects and useBoard call the right addresses', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { items: [] } });
    const { wrapper } = setup();
    renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/tasks/projects'));
    renderHook(() => useBoard(9, true), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/tasks/projects/9/board', { params: { oldDone: '1' } }));
    renderHook(() => useBoard(9, false), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/tasks/projects/9/board', { params: {} }));
    get.mockClear();
    renderHook(() => useProjectCandidates(false), { wrapper });
    expect(get).not.toHaveBeenCalledWith('/tasks/projects/candidates');
  });

  it('useBoard refreshes every 5 seconds only when visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: board() });
    const { wrapper } = setup();
    renderHook(() => useBoard(9, false), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    vi.useRealTimers();
  });

  it('moveInBoard puts the card before another one or at the end of a column', () => {
    const b = board();
    expect(moveInBoard(b.tasks, 2, { column: 'draft', beforeTaskId: 1 }).filter((t) => t.column === 'draft').map((t) => t.id)).toEqual([2, 1]);
    const moved = moveInBoard(b.tasks, 1, { column: 'in_progress', beforeTaskId: null });
    expect(moved.filter((t) => t.column === 'in_progress').map((t) => t.id)).toEqual([3, 1]);
    expect(moved.filter((t) => t.column === 'draft').map((t) => t.id)).toEqual([2]);
  });

  it('useMoveTask changes the board at once and restores it on error', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(boardKey(9, false), board());
    let fail: (e: Error) => void = () => undefined;
    const post = vi.spyOn(api, 'post').mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useMoveTask(9, false), { wrapper });
    act(() => result.current.mutate({ taskId: 1, column: 'in_progress', beforeTaskId: null }));
    await waitFor(() => expect(queryClient.getQueryData<BoardResponse>(boardKey(9, false))!.tasks.find((t) => t.id === 1)!.column).toBe('in_progress'));
    await waitFor(() => expect(post).toHaveBeenCalled());
    act(() => fail(new Error('500')));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(post).toHaveBeenCalledWith('/tasks/1/move', { column: 'in_progress', beforeTaskId: null });
    expect(queryClient.getQueryData<BoardResponse>(boardKey(9, false))!.tasks.find((t) => t.id === 1)!.column).toBe('draft');
  });

  it('project and task mutations call their addresses and refresh the tasks data', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 40 } });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true, deletedTasks: 2 } });
    const { wrapper, invalidate } = setup();
    await renderHook(() => useSaveProject(), { wrapper }).result.current.mutateAsync({ name: 'Marketing', memberIds: [5] });
    await renderHook(() => useSaveProject(), { wrapper }).result.current.mutateAsync({ id: 9, name: 'Marketing', memberIds: [5] });
    await renderHook(() => useMoveProject(), { wrapper }).result.current.mutateAsync({ id: 9, direction: 'up' });
    await renderHook(() => useDeleteProject(), { wrapper }).result.current.mutateAsync({ id: 9, confirmName: 'Marketing' });
    const save = { title: 'Ulotki', description: '', dueDate: null, column: 'draft' as const, assigneeIds: [] };
    await renderHook(() => useSaveTask(9), { wrapper }).result.current.mutateAsync(save);
    await renderHook(() => useSaveTask(9), { wrapper }).result.current.mutateAsync({ ...save, id: 40 });
    await renderHook(() => useArchiveTask(), { wrapper }).result.current.mutateAsync(40);
    expect(post.mock.calls).toEqual([
      ['/tasks/projects', { name: 'Marketing', memberIds: [5] }],
      ['/tasks/projects/9/move', { direction: 'up' }],
      ['/tasks/projects/9/tasks', save],
      ['/tasks/40/archive'],
    ]);
    expect(put.mock.calls).toEqual([['/tasks/projects/9', { name: 'Marketing', memberIds: [5] }], ['/tasks/40', save]]);
    expect(del).toHaveBeenCalledWith('/tasks/projects/9', { data: { confirmName: 'Marketing' } });
    await waitFor(() => expect(invalidate.mock.calls.filter(([f]) => JSON.stringify(f) === '{"queryKey":["tasks"]}')).toHaveLength(7));
  });
});
