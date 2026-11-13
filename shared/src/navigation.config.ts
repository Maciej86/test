import type { Role } from './constants/roles';
import type { AreaHome, Areas, NavItem, PublicNavItem } from './navigation';

/**
 * Części aplikacji. /stepkit:start ustawia je po wywiadzie:
 * public = strona dla odwiedzających, account = konto użytkownika, admin = panel administracyjny.
 */
export const AREAS: Areas = { public: false, account: false, admin: true };

/** Dokąd trafia rola po zalogowaniu. */
export const ROLE_HOME: Record<Role, AreaHome> = { admin: '/admin', employee: '/admin' };

/** Strona dla odwiedzających (adres /). */
export const PUBLIC_NAVIGATION: PublicNavItem[] = [];

/** Konto użytkownika (adres /account). */
export const ACCOUNT_NAVIGATION: NavItem[] = [];

/** Panel administracyjny (adres /admin). */
export const NAVIGATION: NavItem[] = [
  { key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin', 'employee'] },
  { key: 'my-leave', path: '/admin/my-leave', label: 'common.nav.my_leave', icon: 'calendar-days', roles: ['employee'] },
  { key: 'leave-requests', path: '/admin/leave-requests', label: 'common.nav.leave_requests', icon: 'calendar-check', roles: ['admin'] },
  { key: 'tasks', path: '/admin/tasks', label: 'common.nav.tasks', icon: 'square-kanban', roles: ['admin', 'employee'] },
  { key: 'employees', path: '/admin/employees', label: 'common.nav.employees', icon: 'users', roles: ['admin'] },
  { key: 'leave-types', path: '/admin/leave-types', label: 'common.nav.leave_types', icon: 'tags', roles: ['admin'] },
  { key: 'activity-log', path: '/admin/activity-log', label: 'common.nav.activity_log', icon: 'history', roles: ['admin'] },
  { key: 'archive', path: '/admin/archive', label: 'common.nav.archive', icon: 'archive', roles: ['admin'] },
  { key: 'my-account', path: '/admin/my-account', label: 'common.nav.my_account', icon: 'user', roles: ['admin', 'employee'] },
];
