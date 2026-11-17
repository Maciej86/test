import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveRequestDetails, LeaveRequestsListQuery, LeaveRequestsListResponse } from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['leave-requests'] as const;

/** Strona listy z filtrami z adresu. */
export const useLeaveRequests = (query: LeaveRequestsListQuery) => {
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: () => api.get<LeaveRequestsListResponse>('/leave-requests', { params: query }).then((r) => r.data),
  });
};

/** Szczegóły wniosku z adresu `/admin/leave-requests/:id`; bez numeru nic nie pobiera. */
export const useLeaveRequest = (id: number | null) => {
  return useQuery({
    queryKey: [...KEY, 'details', id],
    queryFn: () => api.get<LeaveRequestDetails>(`/leave-requests/${id}`).then((r) => r.data),
    enabled: id !== null,
  });
};

/**
 * Decyzja odświeża listę i szczegóły także po odmowie serwera (np. wniosek rozpatrzył już ktoś inny), oraz
 * Pracowników (pula osoby zmienia się po odrzuceniu i anulowaniu).
 */
const useDecision = <T,>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export const useApproveRequest = () => useDecision((id: number) => api.post(`/leave-requests/${id}/approve`));

export const useRejectRequest = () =>
  useDecision(({ id, reason }: { id: number; reason: string }) => api.post(`/leave-requests/${id}/reject`, { reason }));

export const useCancelRequest = () =>
  useDecision(({ id, reason }: { id: number; reason: string }) => api.post(`/leave-requests/${id}/cancel`, { reason }));

/** Adres PDF zatwierdzonego wniosku: zwykły odnośnik do nowej karty (ciasteczko logowania dołącza przeglądarka). */
export const leaveRequestPdfUrl = (id: number): string => `${api.defaults.baseURL}/leave-requests/${id}/pdf`;
