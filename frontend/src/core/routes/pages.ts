import type { Pages } from './buildRoutes';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';
import { LoginPage } from '../../modules/login/LoginPage';
import { ChangePasswordPage } from '../../modules/login/ChangePasswordPage';
import { EmployeesListPage } from '../../modules/employees/EmployeesListPage';
import { LeaveTypesPage } from '../../modules/leave-types/LeaveTypesPage';
import { NotificationsPage } from '../../modules/notifications/NotificationsPage';

/** Ekran każdej pozycji nawigacji (klucz = NavItem.key). Nowy moduł dopisuje się tutaj. */
export const PAGES: Pages = {
  dashboard: DashboardPage,
  login: LoginPage,
  'change-password': ChangePasswordPage,
  employees: EmployeesListPage,
  'leave-types': LeaveTypesPage,
  // Bez pozycji w menu: adres w buildAppRoutes (NOTIFICATIONS_PATH).
  notifications: NotificationsPage,
};
