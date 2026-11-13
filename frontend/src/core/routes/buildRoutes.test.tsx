import { screen } from '@testing-library/react';
import type { NavItem, SessionUser } from '@app/shared';
import { buildAppRoutes } from './buildAppRoutes';
import { buildRoutes } from './buildRoutes';
import { renderRoutes } from '../../test/render';

const admin: SessionUser = { id: 1, name: 'Anna', role: 'admin' };
const user: SessionUser = { id: 2, name: 'Jan', role: 'user' };
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

  it('sends a user from / to the account when there is no public site', async () => {
    const { router } = renderRoutes(buildAppRoutes({ public: false, account: true, admin: true }, {}, user), '/');
    await screen.findByText('Ten ekran jeszcze nie powstał.');
    expect(router.state.location.pathname).toBe('/account');
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
    renderRoutes(buildAppRoutes({ public: true, account: true, admin: false }, {}, null), '/');
    expect(await screen.findByText('Zaloguj się')).toBeInTheDocument();
  });

  it('blocks a user from the panel', async () => {
    renderRoutes(buildAppRoutes({ public: true, account: true, admin: true }, {}, user), '/admin');
    expect(await screen.findByText('Nie masz dostępu do tej części aplikacji.')).toBeInTheDocument();
  });
});
