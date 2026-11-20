import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { createQueryClient } from '../../../core/api/queryClient';
import { useDashboard } from '../dashboard.api';

afterEach(() => vi.restoreAllMocks());

describe('useDashboard', () => {
  // Błąd z testu e2e: po złożeniu wniosku powrót na Pulpit pokazywał dane sprzed chwili (aplikacja trzyma dane 30 s).
  it('fetches again on every visit, even with the app default stale time', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { role: 'employee' } });
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    const first = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenCalledWith('/dashboard');
  });
});
