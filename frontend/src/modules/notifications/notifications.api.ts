import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NOTIFICATION_REFRESH_MS,
  type NotificationsListResponse,
  type NotificationsQuery,
  type NotificationsSummary,
} from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['notifications'] as const;

/** Dzwonek: odświeża się co minutę i od razu po powrocie do karty przeglądarki. */
export const useNotificationsSummary = () => {
  return useQuery({
    queryKey: [...KEY, 'summary'],
    queryFn: () => api.get<NotificationsSummary>('/notifications/summary').then((r) => r.data),
    refetchInterval: NOTIFICATION_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};

export const useNotificationsList = (query: NotificationsQuery) => {
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: () => api.get<NotificationsListResponse>('/notifications', { params: query }).then((r) => r.data),
    refetchOnWindowFocus: true,
    // Przy zmianie filtra albo strony zostają poprzednie dane, zamiast licznika „(0)” i kręciołka.
    placeholderData: keepPreviousData,
  });
};

/** Każda zmiana odświeża dzwonek i stronę. */
const useNotificationsMutation = <T,>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMarkRead = () => {
  return useNotificationsMutation((id: number) => api.post(`/notifications/${id}/read`));
};

export const useMarkAllRead = () => {
  return useNotificationsMutation((_: void) => api.post<{ updated: number }>('/notifications/read-all'));
};
