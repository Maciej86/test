import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { useMyRequests } from '../my-leave.api';

afterEach(() => vi.restoreAllMocks());

describe('my leave api', () => {
  // Zmiana roku nie może na chwilę opróżnić listy wniosków (ekran by skakał).
  it('useMyRequests keeps the previous year while the next one is loading', async () => {
    const first = { items: [], year: 2026 };
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: first })
      .mockReturnValueOnce(new Promise(() => undefined));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ year }) => useMyRequests(year), { wrapper, initialProps: { year: 2026 } });
    await waitFor(() => expect(result.current.data).toEqual(first));
    rerender({ year: 2025 });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toEqual(first);
  });
});
