import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContractTypeDirection, ContractTypeInput, ContractTypesListResponse } from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['contract-types'] as const;
/** Lista pracowników pokazuje nazwę typu, a okno pracownika listę typów: po zmianie też się odświeżają. */
const EMPLOYEES_KEY = ['employees'] as const;

export const useContractTypes = () => {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<ContractTypesListResponse>('/contract-types').then((r) => r.data),
  });
};

/** Każda zmiana odświeża listę typów i dane Pracowników. */
const useContractTypesMutation = <T>(fn: (input: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: KEY }),
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    ]),
  });
};

export const useCreateContractType = () => {
  return useContractTypesMutation((input: ContractTypeInput) => api.post<{ id: number }>('/contract-types', input));
};

export const useUpdateContractType = () => {
  return useContractTypesMutation(({ id, ...input }: ContractTypeInput & { id: number }) => api.put(`/contract-types/${id}`, input));
};

export const useMoveContractType = () => {
  return useContractTypesMutation(({ id, direction }: { id: number; direction: ContractTypeDirection }) =>
    api.post(`/contract-types/${id}/move`, { direction }),
  );
};

export const useHideContractType = () => {
  return useContractTypesMutation((id: number) => api.post(`/contract-types/${id}/hide`));
};

export const useUnhideContractType = () => {
  return useContractTypesMutation((id: number) => api.post(`/contract-types/${id}/unhide`));
};
