import { fireEvent, screen, within } from '@testing-library/react';
import type { Areas, NavItem, PublicNavItem } from '@app/shared';
import { MockupApp } from './App';
import { renderWithProviders } from './test/render';

const nav: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] },
  { key: 'missing', path: '/admin/missing', label: 'common.nav.home', icon: 'house', roles: ['admin', 'employee'] },
];
const account: NavItem[] = [
  { key: 'my-account', path: '/account', label: 'common.nav.my_account', icon: 'user', roles: ['admin', 'employee'] },
];
const publicNav: PublicNavItem[] = [{ key: 'home', path: '/', label: 'common.nav.home' }];
const all: Areas = { public: true, account: true, admin: true };

function renderMockup(areas: Areas = all, path = '/admin') {
  return renderWithProviders(
    <MockupApp
      areas={areas}
      navigation={nav}
      accountNavigation={account}
      publicNavigation={publicNav}
      screens={{ dashboard: () => <p>Ekran pulpitu</p>, home: () => <p>Ekran strony</p>, 'my-account': () => <p>Ekran konta</p> }}
      initialPath={path}
    />,
  );
}

describe('mockup shell', () => {
  it('has a phone menu button that closes the menu after choosing a page', async () => {
    renderMockup();
    fireEvent.click(screen.getByLabelText('Pokaż menu'));
    expect(screen.getByLabelText('Schowaj menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Postęp'));
    expect(await screen.findByLabelText('Pokaż menu')).toBeInTheDocument();
  });

  it('shows the app header with the person chosen in "Oglądam jako"', async () => {
    renderMockup(all, '/account');
    expect(await screen.findByText('Ekran konta')).toBeInTheDocument();
    expect(screen.getByText('Urlopy i zadania')).toBeInTheDocument();
    expect(screen.getByText('AN')).toBeInTheDocument();
  });

  it('always shows the MAKIETA bar', () => {
    renderMockup();
    expect(screen.getByText('MAKIETA: to nie jest prawdziwa aplikacja')).toBeInTheDocument();
  });

  it('shows the public site without a role switch', async () => {
    renderMockup(all, '/');
    expect(await screen.findByText('Ekran strony')).toBeInTheDocument();
    expect(screen.queryByText('Oglądam jako:')).not.toBeInTheDocument();
  });

  it('shows the account for the user role', async () => {
    renderMockup(all, '/account');
    expect(await screen.findByText('Ekran konta')).toBeInTheDocument();
    expect(screen.getByText('Oglądam jako:')).toBeInTheDocument();
  });

  it('hides the part switch when only one part is on', () => {
    renderMockup({ public: false, account: false, admin: true });
    expect(screen.queryByRole('radiogroup', { name: 'Część aplikacji' })).not.toBeInTheDocument();
  });

  it('hides admin-only items after switching the role to user', async () => {
    renderMockup();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByText('Pulpit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Pracownik' }));
    expect(within(nav).queryByText('Pulpit')).not.toBeInTheDocument();
  });

  it('always offers Postęp', async () => {
    renderMockup();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByText('Postęp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Pracownik' }));
    expect(within(nav).getByText('Postęp')).toBeInTheDocument();
  });

  it('shows a placeholder for an item without a screen', async () => {
    renderMockup(all, '/admin/missing');
    expect(await screen.findByText('Ten ekran jeszcze nie powstał.')).toBeInTheDocument();
  });
});
