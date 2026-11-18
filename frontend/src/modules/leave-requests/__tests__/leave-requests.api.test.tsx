import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../core/api/client';
import {
  leaveRequestPdfUrl,
  useApproveRequest,
  useCancelRequest,
  useLeaveRequest,
  useLeaveRequests,
  useRejectRequest,
} from '../leave-requests.api';

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { wrapper, invalidate };
};

afterEach(() => vi.restoreAllMocks());

describe('leave requests api', () => {
  it('useLeaveRequests and useLeaveRequest call the right addresses; no id → no request', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
    const { wrapper } = setup();
    renderHook(() => useLeaveRequests({ status: 'approved', year: 2025, page: 2, search: 'Jan' }), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/leave-requests', { params: { status: 'approved', year: 2025, page: 2, search: 'Jan' } }));
    renderHook(() => useLeaveRequest(21), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/leave-requests/21'));
    get.mockClear();
    renderHook(() => useLeaveRequest(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
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

  it('decisions post to their addresses with the reason', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const { wrapper } = setup();
    await renderHook(() => useApproveRequest(), { wrapper }).result.current.mutateAsync(21);
    await renderHook(() => useRejectRequest(), { wrapper }).result.current.mutateAsync({ id: 21, reason: 'Inwentaryzacja.' });
    await renderHook(() => useCancelRequest(), { wrapper }).result.current.mutateAsync({ id: 22, reason: 'Przesunięty.' });
    expect(post.mock.calls).toEqual([
      ['/leave-requests/21/approve'],
      ['/leave-requests/21/reject', { reason: 'Inwentaryzacja.' }],
      ['/leave-requests/22/cancel', { reason: 'Przesunięty.' }],
    ]);
  });

  it('decisions refresh the list, details and employees (pool numbers) after success and after 409', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { ok: true } }).mockRejectedValueOnce(new Error('409'));
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useApproveRequest(), { wrapper });
    await result.current.mutateAsync(21);
    await expect(result.current.mutateAsync(21)).rejects.toThrow();
    expect(post).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(invalidate.mock.calls.filter(([f]) => JSON.stringify(f) === '{"queryKey":["leave-requests"]}')).toHaveLength(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['employees'] });
  });

  it('PDF address for a new tab', () => {
    expect(leaveRequestPdfUrl(21)).toBe(`${api.defaults.baseURL}/leave-requests/21/pdf`);
  });
});
