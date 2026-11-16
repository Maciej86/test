import type { ComponentType } from 'react';
import { DashboardMockup } from './modules/dashboard/DashboardMockup';
import { MyLeaveMockup } from './modules/my-leave/MyLeaveMockup';
import { LeaveRequestsMockup } from './modules/leave-requests/LeaveRequestsMockup';
import { TasksMockup } from './modules/tasks/TasksMockup';
import { ActivityLogMockup } from './modules/activity-log/ActivityLogMockup';
import { ArchiveMockup } from './modules/archive/ArchiveMockup';
import { MyAccountMockup } from './modules/my-account/MyAccountMockup';
import { NotificationsMockup } from './modules/notifications/NotificationsMockup';
import { Done } from './common/Done';
import type { ExtraScreen } from './Shell';

export type { ExtraScreen };

/**
 * Ekran makiety dla każdej pozycji nawigacji (klucz = NavItem.key).
 * Po zamknięciu modułu: zamień wpis na () => <Done labelKey="<etykieta z nawigacji>" /> (zob. mockups.md), a pliki ekranu zostaw.
 */
export const SCREENS: Record<string, ComponentType> = {
  dashboard: DashboardMockup,
  'my-leave': MyLeaveMockup,
  'leave-requests': LeaveRequestsMockup,
  'tasks': TasksMockup,
  // Moduł Pracownicy zrobiony; makieta zostaje w modules/employees/EmployeesMockup.tsx.
  'employees': () => <Done labelKey="common.nav.employees" />,
  // Moduł Typy urlopów zrobiony; makieta zostaje w modules/leave-types/LeaveTypesMockup.tsx.
  'leave-types': () => <Done labelKey="common.nav.leave_types" />,
  'activity-log': ActivityLogMockup,
  'archive': ArchiveMockup,
  'my-account': MyAccountMockup,
};

/** Ekrany spoza menu aplikacji (np. logowanie); w makiecie mają link w menu nad „Postęp”. */
export const EXTRA_SCREENS: ExtraScreen[] = [
  // Moduł Logowanie zrobiony; makieta zostaje w modules/login/LoginMockup.tsx.
  { key: 'login', path: '/login', label: 'common.mockup.screen_login', screen: () => <Done labelKey="common.mockup.screen_login" /> },
  // Moduł E-mail zrobiony; makieta zostaje w modules/email/EmailMockup.tsx.
  { key: 'notifications', path: '/admin/notifications', label: 'common.mockup.screen_notifications', screen: NotificationsMockup },
  { key: 'email', path: '/email', label: 'common.mockup.screen_email', screen: () => <Done labelKey="common.mockup.screen_email" /> },
];
