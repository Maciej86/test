import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { useLeaveRequests } from '../leave-requests.api';

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { wrapper };
};

afterEach(() => vi.restoreAllMocks());

describe('leave requests api', () => {
  it('useLeaveRequests calls the list address with the filters', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
    const { wrapper } = setup();
    renderHook(() => useLeaveRequests({ status: 'approved', year: 2025, page: 2, search: 'Jan' }), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/leave-requests', { params: { status: 'approved', year: 2025, page: 2, search: 'Jan' } }));
  });

  // Przełączenie zakładki nie może na chwilę opróżnić ekranu: znikałby wiersz „1 wniosek czeka…” i tabela skakała.
  it('useLeaveRequests keeps the previous list while the next tab is loading', async () => {
    const first = { items: [], total: 0, page: 1, pageSize: 25, pendingCount: 1, oldestPendingAt: '2026-11-17' };
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: first })
      .mockReturnValueOnce(new Promise(() => undefined));
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ status }) => useLeaveRequests({ status, page: 1, search: '' }), {
      wrapper,
      initialProps: { status: 'pending' as 'pending' | 'approved' },
    });
    await waitFor(() => expect(result.current.data).toEqual(first));
    rerender({ status: 'approved' });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toEqual(first);
  });

});
