import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { z } from 'zod';
import { listQuerySchema } from '@app/shared';
import { useListParams } from '../useListParams';

const schema = listQuerySchema(['name', 'hired_on']).extend({ role: z.enum(['admin', 'employee']).optional().catch(undefined) });
const defaults = { page: 1, search: '', sort: 'name', dir: 'asc' } as const;

const setup = (path: string) => {
  let search = '';
  const Probe = () => {
    search = useLocation().search;
    return null;
  };
  let result!: ReturnType<typeof useListParams<typeof schema>>;
  const Hook = () => {
    result = useListParams(schema, defaults);
    return <Probe />;
  };
  const router = createMemoryRouter([{ path: '*', element: <Hook /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return { get: () => result, url: () => search };
};

describe('useListParams', () => {
  it('reads parameters from the address', () => {
    const { get } = setup('/?page=2&search=kowal&sort=hired_on&dir=desc&role=admin');
    expect(get()[0]).toEqual({ page: 2, search: 'kowal', sort: 'hired_on', dir: 'desc', role: 'admin' });
  });

  it('empty address gives the defaults', () => {
    const { get } = setup('/');
    expect(get()[0]).toEqual({ page: 1, search: '', sort: 'name', dir: 'asc' });
  });

  it('a wrong parameter (e.g. ?sort=foo from an old bookmark) falls back to the default, the rest stays', () => {
    const { get } = setup('/?sort=foo&search=kowal&page=3');
    expect(get()[0]).toMatchObject({ page: 3, search: 'kowal', sort: 'name' });
  });

  it('a change goes back to page 1 and keeps only non-default values in the address', () => {
    const { get, url } = setup('/?page=3&search=kowal');
    act(() => get()[1]({ role: 'admin' }));
    expect(get()[0]).toMatchObject({ page: 1, search: 'kowal', role: 'admin' });
    expect(url()).toBe('?search=kowal&role=admin');
  });

  it('changing the page keeps the filters', () => {
    const { get, url } = setup('/?search=kowal');
    act(() => get()[1]({ page: 2 }));
    expect(url()).toBe('?page=2&search=kowal');
  });
});
