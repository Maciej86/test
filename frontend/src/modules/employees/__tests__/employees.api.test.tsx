import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { useUpdateEmployee } from '../employees.api';

afterEach(() => vi.restoreAllMocks());

describe('employees api', () => {
  it('saving an employee also refreshes contract types (employees count per type)', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateEmployee(), { wrapper });
    await result.current.mutateAsync({ id: 2, firstName: 'Jan', lastName: 'Kowalski', login: 'jan@firma.pl', email: '', role: 'employee', hiredOn: null, contractTypeId: null });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['employees'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['contract-types'] });
    // Nowa osoba, inne imię albo archiwum zmienia wiersze Kalendarza.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['calendar'] });
  });
});
