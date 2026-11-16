import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveTypeDirection, LeaveTypeInput, LeaveTypesListResponse } from '@app/shared';
import { api } from '../../core/api/client';

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useCreateLeaveType = () => {
  return useLeaveTypesMutation((input: LeaveTypeInput) => api.post<{ id: number }>('/leave-types', input));
};

export const useUpdateLeaveType = () => {
  return useLeaveTypesMutation(({ id, ...input }: LeaveTypeInput & { id: number }) => api.put(`/leave-types/${id}`, input));
};

export const useMoveLeaveType = () => {
  return useLeaveTypesMutation(({ id, direction }: { id: number; direction: LeaveTypeDirection }) =>
    api.post(`/leave-types/${id}/move`, { direction }),
  );
};

export const useHideLeaveType = () => {
  return useLeaveTypesMutation((id: number) => api.post(`/leave-types/${id}/hide`));
};

export const useUnhideLeaveType = () => {
  return useLeaveTypesMutation((id: number) => api.post(`/leave-types/${id}/unhide`));
};
