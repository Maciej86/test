import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderDirection, LeaveTypeInput, LeaveTypesListResponse } from '@app/shared';
import { api } from '../../core/api/client';
import { CALENDAR_KEY } from '../../core/queryKeys';

const KEY = ['leave-types'] as const;

export const useLeaveTypes = () => {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<LeaveTypesListResponse>('/leave-types').then((r) => r.data),
  });
};

/** Każda zmiana odświeża listę. */
const useLeaveTypesMutation = <T>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Kolor i nazwa typu są też na paskach Kalendarza.
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: KEY }), queryClient.invalidateQueries({ queryKey: CALENDAR_KEY })]),
  });
};

export const useCreateLeaveType = () => {
  return useLeaveTypesMutation((input: LeaveTypeInput) => api.post<{ id: number }>('/leave-types', input));
};

export const useUpdateLeaveType = () => {
  return useLeaveTypesMutation(({ id, ...input }: LeaveTypeInput & { id: number }) => api.put(`/leave-types/${id}`, input));
};

export const useMoveLeaveType = () => {
  return useLeaveTypesMutation(({ id, direction }: { id: number; direction: OrderDirection }) =>
    api.post(`/leave-types/${id}/move`, { direction }),
  );
};

export const useHideLeaveType = () => {
  return useLeaveTypesMutation((id: number) => api.post(`/leave-types/${id}/hide`));
};

export const useUnhideLeaveType = () => {
  return useLeaveTypesMutation((id: number) => api.post(`/leave-types/${id}/unhide`));
};
