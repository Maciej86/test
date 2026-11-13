import i18next, { type i18n } from 'i18next';
import common from '../locales/pl/common.json';
import email from '../locales/pl/email.json';
import server from '../locales/pl/server.json';
import validation from '../locales/pl/validation.json';
import dashboard from '../locales/pl/dashboard.json';
import home from '../locales/pl/home.json';
import myAccount from '../locales/pl/my-account.json';

/**
 * Teksty aplikacji. Każdy moduł ma własny plik locales/pl/<module>.json, dopisany tutaj.
 * Nowy język: skopiuj locales/pl do np. locales/en i dopisz go tutaj.
 */
export const resources = {
  pl: { common, server, validation, email, dashboard, home, 'my-account': myAccount },
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
