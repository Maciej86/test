import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { LeaveRequestsListQuery, LeaveRequestsListResponse } from '@app/shared';
import { api } from '../../core/api/client';
import { LEAVE_REQUESTS_KEY } from '../../core/leaveRequestDecisions';

/**
 * Strona listy z filtrami z adresu. Przy zmianie zakładki, filtra albo strony zostaje poprzednia lista, dopóki nie
 * przyjdzie nowa (inaczej znika podsumowanie nad tabelą i ekran skacze). Szczegóły i decyzje: `core/leaveRequestDecisions`.
 */
export const useLeaveRequests = (query: LeaveRequestsListQuery) => {
  return useQuery({
    queryKey: [...LEAVE_REQUESTS_KEY, 'list', query],
    queryFn: () => api.get<LeaveRequestsListResponse>('/leave-requests', { params: query }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
};
