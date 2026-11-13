import i18next, { type i18n } from 'i18next';
import common from '../locales/pl/common.json';
import email from '../locales/pl/email.json';
import server from '../locales/pl/server.json';
import validation from '../locales/pl/validation.json';
import dashboard from '../locales/pl/dashboard.json';
import myLeave from '../locales/pl/my-leave.json';
import leaveRequests from '../locales/pl/leave-requests.json';
import tasks from '../locales/pl/tasks.json';
import employees from '../locales/pl/employees.json';
import leaveTypes from '../locales/pl/leave-types.json';
import activityLog from '../locales/pl/activity-log.json';
import archive from '../locales/pl/archive.json';
import myAccount from '../locales/pl/my-account.json';

/**
 * Teksty aplikacji. Każdy moduł ma własny plik locales/pl/<module>.json, dopisany tutaj.
 * Nowy język: skopiuj locales/pl do np. locales/en i dopisz go tutaj.
 */
export const resources = {
  pl: { common, server, validation, email, dashboard, 'my-leave': myLeave, 'leave-requests': leaveRequests, tasks, employees, 'leave-types': leaveTypes, 'activity-log': activityLog, archive, 'my-account': myAccount },
} as const;

export type Language = keyof typeof resources;

export function createI18n(lng: Language = 'pl'): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng,
    fallbackLng: 'pl',
    ns: Object.keys(resources.pl),
    defaultNS: 'common',
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}

/** Tłumaczy klucz w formie '<namespace>.<reszta>', np. 'server.no_access'. */
export function translateKey(t: i18n['t'], key: string): string {
  const [ns, ...rest] = key.split('.');
  return t(rest.join('.'), { ns }) as string;
}
