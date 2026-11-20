import type { Role } from './constants/roles';
import { ACTIVITY_LOG_PATH } from './constants/activityLog';
import { CONTRACT_TYPES_PATH } from './constants/contractTypes';
import { MY_ACCOUNT_PATH } from './constants/myAccount';
import { MY_LEAVE_PATH } from './constants/myLeave';
import { EMPLOYEES_PATH } from './constants/employees';
import { LEAVE_REQUESTS_PATH } from './constants/leaveRequests';
import { LEAVE_TYPES_PATH } from './constants/leaveTypes';
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
  { key: 'my-leave', path: MY_LEAVE_PATH, label: 'common.nav.my_leave', icon: 'calendar-days', roles: ['employee'] },
  { key: 'leave-requests', path: LEAVE_REQUESTS_PATH, label: 'common.nav.leave_requests', icon: 'calendar-check', roles: ['admin'], detailPath: true },
  {
    // Grupa bez własnej strony: projekty dokłada w czasie działania useAppNavigation (frontend/src/core/routes).
    key: 'tasks',
    path: '/admin/tasks',
    label: 'common.nav.tasks',
    icon: 'square-kanban',
    roles: ['admin', 'employee'],
    children: [
      { key: 'task-projects', path: '/admin/tasks/projects', label: 'common.nav.task_projects', icon: 'folder-cog', roles: ['admin'] },
    ],
  },
  { key: 'employees', path: EMPLOYEES_PATH, label: 'common.nav.employees', icon: 'users', roles: ['admin'] },
  { key: 'activity-log', path: ACTIVITY_LOG_PATH, label: 'common.nav.activity_log', icon: 'history', roles: ['admin'] },
  { key: 'archive', path: '/admin/archive', label: 'common.nav.archive', icon: 'archive', roles: ['admin'] },
  {
    key: 'settings',
    path: '/admin/settings',
    label: 'common.nav.settings',
    icon: 'settings',
    roles: ['admin'],
    children: [
      { key: 'leave-types', path: LEAVE_TYPES_PATH, label: 'common.nav.leave_types', icon: 'tags', roles: ['admin'] },
      { key: 'contract-types', path: CONTRACT_TYPES_PATH, label: 'common.nav.contract_types', icon: 'file-signature', roles: ['admin'] },
    ],
  },
  { key: 'my-account', path: MY_ACCOUNT_PATH, label: 'common.nav.my_account', icon: 'user', roles: ['admin', 'employee'] },
];
