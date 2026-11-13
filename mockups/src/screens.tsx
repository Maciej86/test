import type { ComponentType } from 'react';
import { DashboardMockup } from './modules/dashboard/DashboardMockup';
import { MyLeaveMockup } from './modules/my-leave/MyLeaveMockup';
import { LeaveRequestsMockup } from './modules/leave-requests/LeaveRequestsMockup';
import { TasksMockup } from './modules/tasks/TasksMockup';
import { EmployeesMockup } from './modules/employees/EmployeesMockup';
import { LeaveTypesMockup } from './modules/leave-types/LeaveTypesMockup';
import { ActivityLogMockup } from './modules/activity-log/ActivityLogMockup';
import { ArchiveMockup } from './modules/archive/ArchiveMockup';
import { MyAccountMockup } from './modules/my-account/MyAccountMockup';

/**
 * Ekran makiety dla każdej pozycji nawigacji (klucz = NavItem.key).
 * Po zamknięciu modułu: zamień wpis na () => <Done labelKey="<etykieta z nawigacji>" /> (zob. mockups.md), a pliki ekranu zostaw.
 */
export const SCREENS: Record<string, ComponentType> = {
  dashboard: DashboardMockup,
  'my-leave': MyLeaveMockup,
  'leave-requests': LeaveRequestsMockup,
  'tasks': TasksMockup,
  'employees': EmployeesMockup,
  'leave-types': LeaveTypesMockup,
  'activity-log': ActivityLogMockup,
  'archive': ArchiveMockup,
  'my-account': MyAccountMockup,
};
