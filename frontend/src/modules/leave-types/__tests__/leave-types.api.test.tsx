import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { api } from '../../../core/api/client';
import { useUpdateLeaveType } from '../leave-types.api';

afterEach(() => vi.restoreAllMocks());

describe('leave types api', () => {
  it('saving a type refreshes the list and the calendar (color of the bars)', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateLeaveType(), { wrapper });
    await result.current.mutateAsync({ id: 3, name: 'Bezpłatny', deductsPool: false, yearlyLimit: '', color: 'grape', dayCount: 'calendar', requiresApproval: false });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leave-types'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['calendar'] });
  });
});
