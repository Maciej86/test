import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { useArchivedTasks, useDeleteEmployee, useRestoreTask } from '../archive.api';

afterEach(() => vi.restoreAllMocks());

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { invalidate, wrapper };
};

describe('archive api', () => {
  it('the tasks list sends search, project and page', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 25, projects: [] } });
    const { wrapper } = setup();
    renderHook(() => useArchivedTasks({ page: 2, search: 'spot', projectId: 3 }), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/archive/tasks', { params: { page: 2, search: 'spot', projectId: 3 } }));
  });

  it('deleting an account sends confirmName and refreshes the archive and the history', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true } });
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useDeleteEmployee(), { wrapper });
    await result.current.mutateAsync({ id: 9, confirmName: 'Olga Testowa' });
    expect(del).toHaveBeenCalledWith('/archive/employees/9', { data: { confirmName: 'Olga Testowa' } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['archive'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['activity-log'] });
    // Usunięta osoba znika z przypisań i projektów: tablice zadań też się odświeżają.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });

  it('restoring a task refreshes the boards too, also when the server says it is gone', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('409'));
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRestoreTask(), { wrapper });
    await expect(result.current.mutateAsync(31)).rejects.toThrow();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['archive'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });
});
