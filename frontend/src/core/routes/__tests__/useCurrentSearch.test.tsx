import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { useCurrentSearch } from '../useCurrentSearch';

/** Wiersz listy: klik przechodzi do szczegółów, zabierając filtry z adresu (jak lista wniosków). */
const List = () => {
  const navigate = useNavigate();
  const currentSearch = useCurrentSearch();
  return <button onClick={() => navigate(`/list/1${currentSearch()}`)}>row</button>;
};

describe('useCurrentSearch', () => {
  it('a click right after the search changed in the address keeps the new search, even before the screen redraws', async () => {
    const router = createMemoryRouter([{ path: '/list', element: <List /> }, { path: '/list/:id', element: <p>details</p> }], { initialEntries: ['/list?status=all'] });
    render(<RouterProvider router={router} />);
    const row = await screen.findByRole('button', { name: 'row' });
    // Wyszukiwarka zmienia adres po przerwie w pisaniu (poza zdarzeniem Reacta), a klik przychodzi od razu potem.
    void router.navigate('/list?status=all&search=Ola');
    fireEvent.click(row);
    expect(await screen.findByText('details')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=all&search=Ola');
  });

  it('without changes returns the search the screen was opened with', async () => {
    const router = createMemoryRouter([{ path: '/list', element: <List /> }, { path: '/list/:id', element: <p>details</p> }], { initialEntries: ['/list?page=2'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(await screen.findByRole('button', { name: 'row' }));
    expect(await screen.findByText('details')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
  });
});
