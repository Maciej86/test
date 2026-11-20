import type { Pages } from './buildRoutes';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';
import { LoginPage } from '../../modules/login/LoginPage';
import { ChangePasswordPage } from '../../modules/login/ChangePasswordPage';
import { EmployeesListPage } from '../../modules/employees/EmployeesListPage';
import { LeaveTypesPage } from '../../modules/leave-types/LeaveTypesPage';
import { ContractTypesPage } from '../../modules/contract-types/ContractTypesPage';
import { NotificationsPage } from '../../modules/notifications/NotificationsPage';
import { MyLeavePage } from '../../modules/my-leave/MyLeavePage';
import { LeaveRequestsPage } from '../../modules/leave-requests/LeaveRequestsPage';
import { ProjectsPage } from '../../modules/tasks/ProjectsPage';
import { TaskBoardPage } from '../../modules/tasks/TaskBoardPage';
import { TasksHomePage } from '../../modules/tasks/TasksHomePage';
import { ActivityLogPage } from '../../modules/activity-log/ActivityLogPage';
import { ArchivePage } from '../../modules/archive/ArchivePage';

/** Ekran każdej pozycji nawigacji (klucz = NavItem.key). Nowy moduł dopisuje się tutaj. */
export const PAGES: Pages = {
  dashboard: DashboardPage,
  login: LoginPage,
  'change-password': ChangePasswordPage,
  employees: EmployeesListPage,
  'leave-types': LeaveTypesPage,
  'contract-types': ContractTypesPage,
  'my-leave': MyLeavePage,
  'leave-requests': LeaveRequestsPage,
  'activity-log': ActivityLogPage,
  archive: ArchivePage,
  // Bez pozycji w menu: adres w buildAppRoutes (TASKS_PATH; tablicę i listę projektów dopisuje moduł Zadania).
  'task-projects': ProjectsPage,
  'tasks-home': TasksHomePage,
  'task-board': TaskBoardPage,
  // Bez pozycji w menu: adres w buildAppRoutes (NOTIFICATIONS_PATH).
  notifications: NotificationsPage,
};
