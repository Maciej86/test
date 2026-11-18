import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { NavItem } from '@app/shared';
import { NavMenu } from '../NavMenu';
import { renderWithProviders } from '../../test/render';

const items: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin', 'employee'] },
  { key: 'my-account', path: '/admin/secret', label: 'common.nav.my_account', icon: 'user', roles: ['admin'] },
];

describe('NavMenu', () => {
  it('shows only items the role may see', () => {
    renderWithProviders(
      <MemoryRouter>
        <NavMenu items={items} user={{ id: 2, name: 'Jan', role: 'employee', mustChangePassword: false }} />
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
        <NavMenu items={nav} user={{ id: 1, name: 'Ala', role: 'admin', mustChangePassword: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Moje konto').closest('a')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Pulpit').closest('a')).not.toHaveAttribute('data-active');
  });
});

describe('NavMenu group', () => {
  const nav: NavItem[] = [
    { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] },
    {
      key: 'settings', path: '/admin/settings', label: 'common.nav.settings', icon: 'settings', roles: ['admin'],
      children: [{ key: 'leave-types', path: '/admin/leave-types', label: 'common.nav.leave_types', icon: 'tags', roles: ['admin'] }],
    },
  ];
  const admin = { id: 1, name: 'Ala', role: 'admin' as const, mustChangePassword: false };

  it('a group is a toggle, not a link, and opens its items on click', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/admin']}>
        <NavMenu items={nav} user={admin} />
      </MemoryRouter>,
    );
    const group = screen.getByText('Ustawienia').closest('button, a')!;
    expect(group.tagName).toBe('BUTTON');
    fireEvent.click(group);
    expect(screen.getByText('Typy urlopów').closest('a')).toHaveAttribute('href', '/admin/leave-types');
  });

  it('the group is open on the page of one of its items', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/admin/leave-types']}>
        <NavMenu items={nav} user={admin} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Typy urlopów').closest('a')).toHaveAttribute('data-active', 'true');
  });
});

describe('NavMenu ready-made labels', () => {
  it('shows `text` as the label instead of a translation key (projects from the server)', () => {
    const nav: NavItem[] = [
      {
        key: 'tasks', path: '/admin/tasks', label: 'common.nav.tasks', icon: 'square-kanban', roles: ['admin'],
        children: [{ key: 'task-project-3', path: '/admin/tasks/3', label: 'common.nav.tasks', text: 'Montaż', icon: 'folder', roles: ['admin'] }],
      },
    ];
    renderWithProviders(
      <MemoryRouter initialEntries={['/admin/tasks/3']}>
        <NavMenu items={nav} user={{ id: 1, name: 'Anna', role: 'admin', mustChangePassword: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Montaż')).toBeInTheDocument();
  });
});
