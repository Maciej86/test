import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayIsoDate, type LeaveRequestDetails, type LeaveRequestListItem } from '@app/shared';
import { api } from './api/client';

/** Klucz zapytań Wniosków urlopowych (lista i szczegóły). */
export const LEAVE_REQUESTS_KEY = ['leave-requests'] as const;

/**
 * Dane, które pokazują skutek decyzji o wniosku: wnioski, pule w Pracownikach, kalendarz i Pulpit (czekające,
 * nieobecności). Decyzja odświeża je wszystkie, także po odmowie serwera (ktoś był szybszy).
 */
const AFFECTED = [LEAVE_REQUESTS_KEY, ['employees'], ['calendar'], ['dashboard']] as const;

/** Czekający wniosek, którego termin już się zaczął albo minął (można go rozpatrzyć, ale warto to widzieć). */
export const isLate = (r: Pick<LeaveRequestListItem, 'status' | 'dateFrom'>) => r.status === 'pending' && r.dateFrom < todayIsoDate();

/** Co można zrobić z wnioskiem z listy albo ze szczegółów. */
export interface LeaveRequestActions {
  onApprove: (r: LeaveRequestListItem) => void;
  onReject: (r: LeaveRequestListItem) => void;
  onCancel: (r: LeaveRequestListItem) => void;
}

/** Szczegóły wniosku (Wnioski urlopowe, Kalendarz); bez numeru nic nie pobiera. */
export const useLeaveRequest = (id: number | null) => {
  return useQuery({
    queryKey: [...LEAVE_REQUESTS_KEY, 'details', id],
    queryFn: () => api.get<LeaveRequestDetails>(`/leave-requests/${id}`).then((r) => r.data),
    enabled: id !== null,
  });
};

const useDecision = <T,>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      for (const queryKey of AFFECTED) void queryClient.invalidateQueries({ queryKey });
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
