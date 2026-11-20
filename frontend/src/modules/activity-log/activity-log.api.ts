import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ActivityLogListResponse, ActivityLogPerson, ActivityLogQuery } from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['activity-log'] as const;

export const useActivityLog = (query: ActivityLogQuery) => {
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: () => api.get<ActivityLogListResponse>('/activity-log', { params: query }).then((r) => r.data),
    refetchOnWindowFocus: true,
    // Przy zmianie filtra albo strony zostają poprzednie wpisy zamiast kręciołka.
    placeholderData: keepPreviousData,
  });
};

/** Osoby do filtra „Kto zmienił”. */
export const useActivityPeople = () => {
  return useQuery({
    queryKey: [...KEY, 'people'],
    queryFn: () => api.get<ActivityLogPerson[]>('/activity-log/people').then((r) => r.data),
  });
};
