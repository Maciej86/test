import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TASK_BOARD_REFRESH_MS,
  type BoardResponse,
  type CommentInput,
  type OrderDirection,
  type ProjectCandidate,
  type ProjectInput,
  type ProjectsResponse,
  type TaskInput,
  type TaskComment,
  type TaskMoveInput,
} from '@app/shared';
import { api } from '../../core/api/client';
import { moveInBoard } from './boardMove';

const KEY = ['tasks'] as const;

/** Klucz danych tablicy projektu (z albo bez starszych zrealizowanych). */
export const boardKey = (projectId: number, oldDone: boolean) => [...KEY, 'board', projectId, oldDone] as const;

/** Projekty widoczne dla zalogowanej osoby (menu „Zadania” i lista projektów). */
export const useProjects = (enabled = true) => {
  return useQuery({
    queryKey: [...KEY, 'projects'],
    queryFn: () => api.get<ProjectsResponse>('/tasks/projects').then((r) => r.data),
    enabled,
  });
};

/** Pracownicy do wyboru w oknie projektu (tylko administrator, gdy okno jest otwarte). */
export const useProjectCandidates = (enabled: boolean) => {
  return useQuery({
    queryKey: [...KEY, 'candidates'],
    queryFn: () => api.get<ProjectCandidate[]>('/tasks/projects/candidates').then((r) => r.data),
    enabled,
  });
};

/**
 * Tablica projektu. Odświeża się co 5 s tylko przy widocznej karcie przeglądarki i od razu po powrocie do niej;
 * w trakcie pobierania zostają poprzednie dane (ekran nie skacze).
 */
export const useBoard = (projectId: number, oldDone: boolean) => {
  return useQuery({
    queryKey: boardKey(projectId, oldDone),
    queryFn: () => api.get<BoardResponse>(`/tasks/projects/${projectId}/board`, { params: oldDone ? { oldDone: '1' } : {} }).then((r) => r.data),
    refetchInterval: TASK_BOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
};

/**
 * Każda zmiana projektów i zadań odświeża wszystkie dane modułu (menu, listę projektów, tablice). `alsoOnError`:
 * także po błędzie (np. komentarz usunięty w międzyczasie przez kogoś innego znika z listy).
 */
const useTasksMutation = <T, R = unknown>(fn: (input: T) => Promise<R>, { alsoOnError = false } = {}) => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  return useMutation({
    mutationFn: fn,
    onSuccess: refresh,
    onError: alsoOnError ? refresh : undefined,
  });
};

export const useSaveProject = () =>
  useTasksMutation(({ id, ...input }: ProjectInput & { id?: number }) =>
    id === undefined ? api.post<{ id: number }>('/tasks/projects', input) : api.put(`/tasks/projects/${id}`, input),
  );

export const useMoveProject = () =>
  useTasksMutation(({ id, direction }: { id: number; direction: OrderDirection }) => api.post(`/tasks/projects/${id}/move`, { direction }));

export const useDeleteProject = () =>
  useTasksMutation(({ id, confirmName }: { id: number; confirmName: string }) => api.delete(`/tasks/projects/${id}`, { data: { confirmName } }));

export const useSaveTask = (projectId: number) =>
  useTasksMutation(({ id, ...input }: TaskInput & { id?: number }) =>
    id === undefined ? api.post<{ id: number }>(`/tasks/projects/${projectId}/tasks`, input) : api.put(`/tasks/${id}`, input),
  );

export const useArchiveTask = () => useTasksMutation((id: number) => api.post(`/tasks/${id}/archive`));

/** Znacznik „Zakończone” (karta zostaje w kolumnie, wyszarzona) albo jego cofnięcie. */
export const useFinishTask = () =>
  useTasksMutation(({ id, finished }: { id: number; finished: boolean }) => api.post(`/tasks/${id}/finish`, { finished }));

/**
 * Przeciągnięcie karty: tablica zmienia się od razu (bez czekania na serwer); przy błędzie wraca poprzedni stan,
 * a po odpowiedzi dane pobierają się od nowa z serwera.
 */
export const useMoveTask = (projectId: number, oldDone: boolean) => {
  const queryClient = useQueryClient();
  const key = boardKey(projectId, oldDone);
  return useMutation({
    mutationFn: ({ taskId, ...move }: TaskMoveInput & { taskId: number }) => api.post(`/tasks/${taskId}/move`, move),
    onMutate: async ({ taskId, ...move }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardResponse>(key);
      if (previous) queryClient.setQueryData<BoardResponse>(key, { ...previous, tasks: moveInBoard(previous.tasks, taskId, move) });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

/** Komentarze zadania w podglądzie: odświeżane co 5 s przy widocznej karcie przeglądarki, jak tablica. */
export const useTaskComments = (taskId: number) => {
  return useQuery({
    queryKey: [...KEY, 'comments', taskId],
    queryFn: () => api.get<TaskComment[]>(`/tasks/${taskId}/comments`).then((r) => r.data),
    refetchInterval: TASK_BOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
};

/** Dodanie, poprawka i usunięcie komentarza odświeżają komentarze i licznik na karcie (cały klucz modułu). */
export const useAddComment = (taskId: number) =>
  useTasksMutation((input: CommentInput) => api.post<{ id: number }>(`/tasks/${taskId}/comments`, input), { alsoOnError: true });

export const useEditComment = () =>
  useTasksMutation(({ id, ...input }: CommentInput & { id: number }) => api.put(`/tasks/comments/${id}`, input), { alsoOnError: true });

export const useDeleteComment = () => useTasksMutation((id: number) => api.delete(`/tasks/comments/${id}`), { alsoOnError: true });
