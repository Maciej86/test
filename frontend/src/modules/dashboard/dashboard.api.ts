import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@app/shared';
import { api } from '../../core/api/client';

/**
 * Pulpit: jedno zapytanie, treść zależna od roli (liczy serwer). Zbiera dane z kilku modułów, więc nie korzysta
 * z 30 s świeżości z całej aplikacji: pobiera je przy każdym wejściu i po powrocie do karty.
 */
export const useDashboard = () => {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardResponse>('/dashboard').then((r) => r.data), staleTime: 0 });
};
