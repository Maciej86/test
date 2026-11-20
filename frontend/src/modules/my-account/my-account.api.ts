import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MyAccount, MyAccountEmailInput, MyAccountPasswordInput } from '@app/shared';
import { api } from '../../core/api/client';

const KEY = ['my-account'] as const;
/** Lista Pracowników pokazuje e-mail do powiadomień: po zmianie też się odświeża. */
const EMPLOYEES_KEY = ['employees'] as const;

export const useMyAccount = () => {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<MyAccount>('/my-account').then((r) => r.data) });
};

export const useSaveMyEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MyAccountEmailInput) => api.put<{ email: string | null }>('/my-account/email', input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: KEY }),
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    ]),
  });
};

/** Serwer odsyła nowe ciasteczko sesji: ta osoba zostaje zalogowana, jej inne sesje się kończą. */
export const useChangeMyPassword = () => {
  return useMutation({ mutationFn: (input: MyAccountPasswordInput) => api.post('/my-account/password', input) });
};
