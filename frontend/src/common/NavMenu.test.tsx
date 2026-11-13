import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { NavItem } from '@app/shared';
import { NavMenu } from './NavMenu';
import { renderWithProviders } from '../test/render';

const items: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin', 'user'] },
  { key: 'my-account', path: '/admin/secret', label: 'common.nav.my_account', icon: 'user', roles: ['admin'] },
];

describe('NavMenu', () => {
  it('shows only items the role may see', () => {
    renderWithProviders(
      <MemoryRouter>
        <NavMenu items={items} user={{ id: 2, name: 'Jan', role: 'user' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Pulpit')).toBeInTheDocument();
    expect(screen.queryByText('Moje konto')).not.toBeInTheDocument();
  });

  it('shows nothing to a logged-out visitor', () => {
    renderWithProviders(
      <MemoryRouter>
        <NavMenu items={items} user={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Pulpit')).not.toBeInTheDocument();
  });
});

describe('NavMenu highlighting', () => {
  const nav: NavItem[] = [
    { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] },
    { key: 'my-account', path: '/admin/orders', label: 'common.nav.my_account', icon: 'user', roles: ['admin'] },
  ];

  it('keeps the module highlighted on its subpages', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/admin/orders/5']}>
        <NavMenu items={nav} user={{ id: 1, name: 'Ala', role: 'admin' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Moje konto').closest('a')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Pulpit').closest('a')).not.toHaveAttribute('data-active');
  });
});
