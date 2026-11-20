import { renderHook } from '@testing-library/react';
import { useEmptyLaterPage } from '../useEmptyLaterPage';

describe('useEmptyLaterPage', () => {
  it('an empty page 2+ goes back to page 1 and says so', () => {
    const toFirstPage = vi.fn();
    const { result } = renderHook(() => useEmptyLaterPage({ items: [] }, 2, toFirstPage));
    expect(result.current).toBe(true);
    expect(toFirstPage).toHaveBeenCalledTimes(1);
  });

  it('page 1, rows on the page or no data yet: nothing happens', () => {
    const toFirstPage = vi.fn();
    expect(renderHook(() => useEmptyLaterPage({ items: [] }, 1, toFirstPage)).result.current).toBe(false);
    expect(renderHook(() => useEmptyLaterPage({ items: [1] }, 3, toFirstPage)).result.current).toBe(false);
    expect(renderHook(() => useEmptyLaterPage(undefined, 3, toFirstPage)).result.current).toBe(false);
    expect(toFirstPage).not.toHaveBeenCalled();
  });
});
