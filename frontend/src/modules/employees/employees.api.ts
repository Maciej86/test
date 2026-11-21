import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CloseYearInput,
  CloseYearPreview,
  EmployeeCreateInput,
  EmployeeInput,
  EmployeesListQuery,
  EmployeesListResponse,
  SelectableContractType,
} from '@app/shared';
import { api } from '../../core/api/client';
import { CALENDAR_KEY } from '../../core/queryKeys';

const KEY = ['employees'] as const;
/** Typy umów pokazują liczbę pracowników z każdym typem: po zapisie pracownika też się odświeżają. */
const CONTRACT_TYPES_KEY = ['contract-types'] as const;

export const useEmployees = (params: EmployeesListQuery) => {
  return useQuery({
    queryKey: [...KEY, 'list', params],
    queryFn: () => api.get<EmployeesListResponse>('/employees', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
};

/** Typy umów do pola „Rodzaj umowy” (widoczne, w kolejności ustawionej w Typach umów). */
export const useContractTypeOptions = () => {
  return useQuery({
    queryKey: [...KEY, 'contract-types'],
    queryFn: () => api.get<{ items: SelectableContractType[] }>('/employees/contract-types').then((r) => r.data.items),
  });
};

/** Każda zmiana odświeża listę, podgląd zamknięcia roku i wiersze Kalendarza. */
const useEmployeesMutation = <T>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: KEY }),
      queryClient.invalidateQueries({ queryKey: CONTRACT_TYPES_KEY }),
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
    ]),
  });
};

export const useCreateEmployee = () => {
  return useEmployeesMutation((input: EmployeeCreateInput) => api.post<{ id: number }>('/employees', input));
};

export const useUpdateEmployee = () => {
  return useEmployeesMutation(({ id, ...input }: EmployeeInput & { id: number }) => api.put(`/employees/${id}`, input));
};

export const useSetEmployeePassword = () => {
  return useEmployeesMutation(({ id, password }: { id: number; password: string }) => api.post(`/employees/${id}/password`, { password }));
};

export const useArchiveEmployee = () => {
  return useEmployeesMutation((id: number) => api.post(`/employees/${id}/archive`));
};

export const useRestoreEmployee = () => {
  return useEmployeesMutation((id: number) => api.post(`/employees/${id}/restore`));
};

export const useCloseYearPreview = (enabled: boolean) => {
  return useQuery({
    queryKey: [...KEY, 'close-year'],
    queryFn: () => api.get<CloseYearPreview>('/employees/close-year').then((r) => r.data),
    enabled,
  });
};

export const useCloseYear = () => {
  return useEmployeesMutation((input: CloseYearInput) => api.post('/employees/close-year', input));
};
