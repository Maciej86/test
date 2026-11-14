import { screen } from '@testing-library/react';
import type { NavItem, SessionUser } from '@app/shared';
import { buildAppRoutes } from './buildAppRoutes';
import { buildRoutes } from './buildRoutes';
import { renderRoutes } from '../../test/render';

const admin: SessionUser = { id: 1, name: 'Anna', role: 'admin', mustChangePassword: false };
const user: SessionUser = { id: 2, name: 'Jan', role: 'employee', mustChangePassword: false };
const Page = () => <p>Strona testowa</p>;

const adminOnly: NavItem = { key: 'reports', path: '/admin/reports', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] };
const noPage: NavItem = { key: 'orders', path: '/admin/orders', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] };

describe('buildRoutes', () => {
  it('shows a placeholder for an item without a page', async () => {
    renderRoutes(buildRoutes([noPage], {}, admin), '/admin/orders');
    expect(await screen.findByText('Ten ekran jeszcze nie powstał.')).toBeInTheDocument();
  });

  it('blocks a role that may not see the item', async () => {
    renderRoutes(buildRoutes([adminOnly], { reports: Page }, user), '/admin/reports');
    expect(await screen.findByText('Nie masz dostępu do tej części aplikacji.')).toBeInTheDocument();
  });

  it('renders the page for an allowed role', async () => {
    renderRoutes(buildRoutes([adminOnly], { reports: Page }, admin), '/admin/reports');
    expect(await screen.findByText('Strona testowa')).toBeInTheDocument();
  });
});

describe('buildAppRoutes', () => {
  it('sends an admin from / to the panel when there is no public site', async () => {
    const { router } = renderRoutes(buildAppRoutes({ public: false, account: true, admin: true }, {}, admin), '/');
    await screen.findByText('Ten ekran jeszcze nie powstał.');
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('sends an employee from / to the panel when there is no public site', async () => {
    const { router } = renderRoutes(buildAppRoutes({ public: false, account: false, admin: true }, {}, user), '/');
    await screen.findByText('Ten ekran jeszcze nie powstał.');
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('has no panel or account when only the public site is on', async () => {
    renderRoutes(buildAppRoutes({ public: true, account: false, admin: false }, {}, admin), '/admin');
    expect(await screen.findByText('Ten ekran jeszcze nie powstał.')).toBeInTheDocument();
  });

  it('hides the login link when nobody can log in', async () => {
    renderRoutes(buildAppRoutes({ public: true, account: false, admin: false }, {}, null), '/');
    await screen.findByText('Ten ekran jeszcze nie powstał.');
    expect(screen.queryByText('Zaloguj się')).not.toBeInTheDocument();
  });

  it('shows the login link on the public site when accounts exist', async () => {
    renderRoutes(buildAppRoutes({ public: true, account: false, admin: true }, {}, null), '/login');
    expect(await screen.findByText('Zaloguj się')).toBeInTheDocument();
  });

  it('lets an employee into the panel', async () => {
    renderRoutes(buildAppRoutes({ public: false, account: false, admin: true }, {}, user), '/admin');
    expect(await screen.findByText('Ten ekran jeszcze nie powstał.')).toBeInTheDocument();
  });
});

describe('login guard', () => {
  const areas = { public: false, account: false, admin: true };
  const pages = {
    login: () => <p>Ekran logowania</p>,
    'change-password': () => <p>Ekran hasła</p>,
    dashboard: () => <p>Pulpit testowy</p>,
    tasks: () => <p>Zadania testowe</p>,
  };

  it('a logged-out person on /admin/tasks sees the login screen', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, null), '/admin/tasks');
    expect(await screen.findByText('Ekran logowania')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('a person with a temporary password on /admin/tasks sees the change password screen', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, { ...user, mustChangePassword: true }), '/admin/tasks');
    expect(await screen.findByText('Ekran hasła')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/change-password');
  });

  it('a logged-in person sees the dashboard', async () => {
    renderRoutes(buildAppRoutes(areas, pages, user), '/admin');
    expect(await screen.findByText('Pulpit testowy')).toBeInTheDocument();
  });

  it('a logged-out person on /change-password sees the login screen', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, null), '/change-password');
    expect(await screen.findByText('Ekran logowania')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
