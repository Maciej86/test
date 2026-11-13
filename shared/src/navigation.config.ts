import type { Role } from './constants/roles';
import type { AreaHome, Areas, NavItem, PublicNavItem } from './navigation';

/**
 * Części aplikacji. /stepkit:start ustawia je po wywiadzie:
 * public = strona dla odwiedzających, account = konto użytkownika, admin = panel administracyjny.
 */
export const AREAS: Areas = { public: true, account: true, admin: true };

/** Dokąd trafia rola po zalogowaniu. */
export const ROLE_HOME: Record<Role, AreaHome> = { admin: '/admin', user: '/account' };

/** Strona dla odwiedzających (adres /). */
export const PUBLIC_NAVIGATION: PublicNavItem[] = [{ key: 'home', path: '/', label: 'common.nav.home' }];

/** Konto użytkownika (adres /account). */
export const ACCOUNT_NAVIGATION: NavItem[] = [
  { key: 'my-account', path: '/account', label: 'common.nav.my_account', icon: 'user', roles: ['user'] },
];

/** Panel administracyjny (adres /admin). */
export const NAVIGATION: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin'] },
];
