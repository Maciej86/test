import { screen } from '@testing-library/react';
import type { NavItem, SessionUser } from '@app/shared';
import { buildAppRoutes } from '../buildAppRoutes';
import { buildRoutes } from '../buildRoutes';
import { renderRoutes } from '../../../test/render';

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

describe('buildRoutes with a detail address', () => {
  const withDetail: NavItem = { ...adminOnly, detailPath: true };

  it('detailPath adds <path>/:id with the same page', async () => {
    renderRoutes(buildRoutes([withDetail], { reports: Page }, admin), '/admin/reports/24');
    expect(await screen.findByText('Strona testowa')).toBeInTheDocument();
  });

  it('the detail address is blocked for a role without access too', async () => {
    renderRoutes(buildRoutes([withDetail], { reports: Page }, user), '/admin/reports/24');
    expect(await screen.findByText('Nie masz dostępu do tej części aplikacji.')).toBeInTheDocument();
  });

  it('an item without detailPath has no /:id address', () => {
    expect(buildRoutes([adminOnly], { reports: Page }, admin).map((r) => r.path)).toEqual(['/admin/reports']);
    expect(buildRoutes([withDetail], { reports: Page }, admin).map((r) => r.path)).toEqual(['/admin/reports', '/admin/reports/:id']);
  });
});

describe('buildRoutes with a group', () => {
  const group: NavItem = {
    key: 'settings', path: '/admin/settings', label: 'common.nav.settings', icon: 'settings', roles: ['admin'],
    children: [adminOnly],
  };

  it('a group has no page of its own, its items do', () => {
    const routes = buildRoutes([group], { reports: Page }, admin);
    expect(routes.map((r) => r.path)).toEqual(['/admin/reports']);
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
    notifications: () => <p>Powiadomienia testowe</p>,
    'task-board': () => <p>Tablica testowa</p>,
    'tasks-home': () => <p>Zadania: przekierowanie</p>,
    'task-projects': () => <p>Projekty testowe</p>,
  };

  it('task board, the bare Zadania address and the project list have their own pages (tasks module)', async () => {
    const { unmount } = renderRoutes(buildAppRoutes(areas, pages, user), '/admin/tasks/9');
    expect(await screen.findByText('Tablica testowa')).toBeInTheDocument();
    unmount();
    const home = renderRoutes(buildAppRoutes(areas, pages, user), '/admin/tasks');
    expect(await screen.findByText('Zadania: przekierowanie')).toBeInTheDocument();
    home.unmount();
    renderRoutes(buildAppRoutes(areas, pages, admin), '/admin/tasks/projects');
    expect(await screen.findByText('Projekty testowe')).toBeInTheDocument();
  });

  it('a logged-out person on a task board sees the login screen with the return address', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, null), '/admin/tasks/9?task=40');
    expect(await screen.findByText('Ekran logowania')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Ftasks%2F9%3Ftask%3D40');
  });

  it('the notifications page (outside the menu) opens in the panel for both roles', async () => {
    renderRoutes(buildAppRoutes(areas, pages, user), '/admin/notifications');
    expect(await screen.findByText('Powiadomienia testowe')).toBeInTheDocument();
  });

  it('a logged-out person on /admin/notifications sees the login screen with the return address', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, null), '/admin/notifications');
    expect(await screen.findByText('Ekran logowania')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fnotifications');
  });

  it('a logged-out person on /admin/tasks sees the login screen', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, null), '/admin/tasks');
    expect(await screen.findByText('Ekran logowania')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('a person with a temporary password on /admin/employees sees the change password screen', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, pages, { ...user, mustChangePassword: true }), '/admin/employees');
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

describe('return address after login', () => {
  const areas = { public: false, account: false, admin: true };
  const Login = () => <p>Logowanie</p>;

  it('a guest opening /admin/leave-requests/128 lands on /login?next=%2Fadmin%2Fleave-requests%2F128', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, { login: Login }, null), '/admin/leave-requests/128?tab=1');
    expect(await screen.findByText('Logowanie')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fleave-requests%2F128%3Ftab%3D1');
  });

  it('a guest opening /admin goes to /login without next', async () => {
    const { router } = renderRoutes(buildAppRoutes(areas, { login: Login }, null), '/admin');
    expect(await screen.findByText('Logowanie')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('a logged-in user on an unknown panel address sees the missing screen, not the login', async () => {
    renderRoutes(buildAppRoutes(areas, { login: Login }, admin), '/admin/nie-ma');
    expect(await screen.findByText('Ten ekran jeszcze nie powstał.')).toBeInTheDocument();
  });
});
