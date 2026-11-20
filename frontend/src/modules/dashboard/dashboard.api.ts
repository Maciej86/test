import { useQuery } from '@tanstack/react-query';
import type { DashboardResponse } from '@app/shared';
import { api } from '../../core/api/client';

/** Pulpit: jedno zapytanie, treść zależna od roli (liczy serwer). Odświeża się przy każdym wejściu i powrocie do karty. */
export const useDashboard = () => {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardResponse>('/dashboard').then((r) => r.data) });
};
