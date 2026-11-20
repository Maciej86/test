import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type {
  ArchiveCounts,
  ArchiveDeleteEmployeeInput,
  ArchivedEmployee,
  ArchivedTaskDetails,
  ArchivedTasksResponse,
  ListResponse,
} from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['archive'] as const;
const HISTORY_KEY = ['activity-log'] as const;

/**
 * Do archiwum trafia się z innych ekranów („Do archiwum” w Pracownikach, kosz na tablicy zadań), a one nie wiedzą
 * o liście archiwum. Dlatego Archiwum przy każdym wejściu pyta serwer, nawet gdy ma zapamiętaną listę.
 */
const FRESH_ON_ENTRY = { refetchOnMount: 'always' } as const;

export const useArchiveCounts = () => {
  return useQuery({
    queryKey: [...KEY, 'counts'],
    queryFn: () => api.get<ArchiveCounts>('/archive/counts').then((r) => r.data),
    ...FRESH_ON_ENTRY,
  });
};

export const useArchivedEmployees = (params: { page: number; search: string }) => {
  return useQuery({
    queryKey: [...KEY, 'employees', params],
    queryFn: () => api.get<ListResponse<ArchivedEmployee>>('/archive/employees', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    ...FRESH_ON_ENTRY,
  });
};

export const useArchivedTasks = (params: { page: number; search: string; projectId?: number }) => {
  return useQuery({
    queryKey: [...KEY, 'tasks', params],
    queryFn: () => api.get<ArchivedTasksResponse>('/archive/tasks', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    ...FRESH_ON_ENTRY,
  });
};

/** Podgląd zadania z archiwum; `null` = podgląd zamknięty (bez zapytania). */
export const useArchivedTask = (id: number | null) => {
  return useQuery({
    queryKey: [...KEY, 'task', id],
    queryFn: () => api.get<ArchivedTaskDetails>(`/archive/tasks/${id}`).then((r) => r.data),
    enabled: id !== null,
    retry: false,
  });
};

/**
 * Akcja w archiwum: po sukcesie i po błędzie (ktoś inny już przywrócił albo usunął) odświeża archiwum, historię zmian
 * i listy, na które rekord wraca albo z których znika (konto: lista pracowników i tablice zadań).
 */
const useArchiveMutation = <T,>(fn: (input: T) => Promise<unknown>, alsoRefresh: QueryKey[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all([KEY, HISTORY_KEY, ...alsoRefresh].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
};

export const useRestoreEmployee = () => useArchiveMutation((id: number) => api.post(`/archive/employees/${id}/restore`), [['employees'], ['tasks']]);

export const useDeleteEmployee = () =>
  useArchiveMutation(({ id, confirmName }: ArchiveDeleteEmployeeInput & { id: number }) => api.delete(`/archive/employees/${id}`, { data: { confirmName } }), [['employees'], ['tasks']]);

export const useRestoreTask = () => useArchiveMutation((id: number) => api.post(`/archive/tasks/${id}/restore`), [['tasks']]);

export const useDeleteTask = () => useArchiveMutation((id: number) => api.delete(`/archive/tasks/${id}`), [['tasks']]);
