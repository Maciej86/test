import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveRequestInput, MyLeaveOverview, MyLeaveRequest, MyLeaveRequestsResponse } from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['my-leave'] as const;

/** Pula roku otwartego, limity typów, lata z wnioskami i zajęte terminy. */
export const useMyLeaveOverview = () => {
  return useQuery({
    queryKey: [...KEY, 'overview'],
    queryFn: () => api.get<MyLeaveOverview>('/my-leave/overview').then((r) => r.data),
  });
};

/** Wnioski z roku; bez roku serwer bierze rok otwarty. */
export const useMyRequests = (year: number | undefined) => {
  return useQuery({
    queryKey: [...KEY, 'requests', year ?? null],
    queryFn: () => api.get<MyLeaveRequestsResponse>('/my-leave/requests', { params: year === undefined ? {} : { year } }).then((r) => r.data),
  });
};

/**
 * Każda zmiana odświeża pulę i listy wniosków, także po odmowie serwera (np. wniosek z innej karty zajął termin),
 * żeby ramka w oknie liczyła już na nowych danych.
 */
const useMyLeaveMutation = <T, R>(fn: (input: T) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useCreateRequest = () => {
  return useMyLeaveMutation((input: LeaveRequestInput) => api.post<MyLeaveRequest>('/my-leave/requests', input).then((r) => r.data));
};

export const useWithdrawRequest = () => {
  return useMyLeaveMutation((id: number) => api.post(`/my-leave/requests/${id}/withdraw`));
};

/** Adres PDF zatwierdzonego wniosku: zwykły odnośnik do nowej karty (ciasteczko logowania dołącza przeglądarka). */
export const myLeavePdfUrl = (id: number): string => `${api.defaults.baseURL}/my-leave/requests/${id}/pdf`;
