import { fireEvent, screen } from '@testing-library/react';
import type { NavItem } from '@app/shared';
import { renderRoutes } from '../test/render';
import { SideMenuLayout } from './SideMenuLayout';

vi.mock('../core/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ala', role: 'admin' }, loading: false, refresh: vi.fn() }),
}));

const items: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] },
  { key: 'my-account', path: '/admin/me', label: 'common.nav.my_account', icon: 'user', roles: ['admin'] },
];

function show() {
  return renderRoutes(
    [{ path: '/admin', element: <SideMenuLayout items={items} />, children: [
      { index: true, element: <p>Pulpit treść</p> },
      { path: 'me', element: <p>Konto treść</p> },
    ] }],
    '/admin',
  );
}

describe('SideMenuLayout', () => {
  it('shows the company name, the user menu, the menu and the page content', () => {
    show();
    expect(screen.getByText('Urlopy i zadania')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Pulpit')).toBeInTheDocument();
    expect(screen.getByText('Pulpit treść')).toBeInTheDocument();
  });

  // Przycisk jest „ukryty od szerokości sm”, więc dla getByRole nie ma nazwy; szukamy go po aria-label.
  it('opens the menu with the phone button and closes it after choosing a page', () => {
    show();
    fireEvent.click(screen.getByLabelText('Pokaż menu'));
    expect(screen.getByLabelText('Schowaj menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Moje konto'));
    expect(screen.getByText('Konto treść')).toBeInTheDocument();
    expect(screen.getByLabelText('Pokaż menu')).toBeInTheDocument();
  });
});
