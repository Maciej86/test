import type { ComponentType } from 'react';
import { DashboardMockup } from './modules/dashboard/DashboardMockup';
import { TASK_SCREENS } from './modules/tasks/navigation';
import { ArchiveMockup } from './modules/archive/ArchiveMockup';
import { MyAccountMockup } from './modules/my-account/MyAccountMockup';
import { Done } from './common/Done';
import type { ExtraScreen } from './Shell';

export type { ExtraScreen };

/**
 * Ekran makiety dla każdej pozycji nawigacji (klucz = NavItem.key).
 * Po zamknięciu modułu: zamień wpis na () => <Done labelKey="<etykieta z nawigacji>" /> (zob. mockups.md), a pliki ekranu zostaw.
 */
const TASKS_DONE: Record<string, ComponentType> = Object.fromEntries(
  Object.keys(TASK_SCREENS).map((key) => [key, () => <Done labelKey={key === 'task-projects' ? 'common.nav.task_projects' : 'common.nav.tasks'} />]),
);

export const SCREENS: Record<string, ComponentType> = {
  dashboard: DashboardMockup,
  // Moduł Moje urlopy zrobiony; makieta zostaje w modules/my-leave/MyLeaveMockup.tsx.
  'my-leave': () => <Done labelKey="common.nav.my_leave" />,
  // Moduł Wnioski urlopowe zrobiony; makieta zostaje w modules/leave-requests/LeaveRequestsMockup.tsx.
  'leave-requests': () => <Done labelKey="common.nav.leave_requests" />,
  // Moduł Zadania zrobiony; makieta zostaje w modules/tasks/ (projekty w menu dokłada withTaskProjects).
  ...TASKS_DONE,
  // Moduł Pracownicy zrobiony; makieta zostaje w modules/employees/EmployeesMockup.tsx.
  'employees': () => <Done labelKey="common.nav.employees" />,
  // Moduł Typy urlopów zrobiony; makieta zostaje w modules/leave-types/LeaveTypesMockup.tsx.
  'leave-types': () => <Done labelKey="common.nav.leave_types" />,
  // Moduł Typy umów zrobiony; makieta zostaje w modules/contract-types/ContractTypesMockup.tsx.
  'contract-types': () => <Done labelKey="common.nav.contract_types" />,
  'activity-log': () => <Done labelKey="common.nav.activity_log" />,
  'archive': ArchiveMockup,
  'my-account': MyAccountMockup,
};

/** Ekrany spoza menu aplikacji (np. logowanie); w makiecie mają link w menu nad „Postęp”. */
export const EXTRA_SCREENS: ExtraScreen[] = [
  // Moduł Logowanie zrobiony; makieta zostaje w modules/login/LoginMockup.tsx.
  { key: 'login', path: '/login', label: 'common.mockup.screen_login', screen: () => <Done labelKey="common.mockup.screen_login" /> },
  // Moduł E-mail zrobiony; makieta zostaje w modules/email/EmailMockup.tsx.
  // Moduł Powiadomienia zrobiony; makieta zostaje w modules/notifications/ (dzwonek w belce makiety też).
  { key: 'notifications', path: '/admin/notifications', label: 'common.mockup.screen_notifications', screen: () => <Done labelKey="common.mockup.screen_notifications" /> },
  { key: 'email', path: '/email', label: 'common.mockup.screen_email', screen: () => <Done labelKey="common.mockup.screen_email" /> },
];
