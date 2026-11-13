import type { ComponentType } from 'react';
import { DashboardMockup } from './modules/dashboard/DashboardMockup';
import { HomeMockup } from './modules/home/HomeMockup';
import { MyAccountMockup } from './modules/my-account/MyAccountMockup';

/**
 * Ekran makiety dla każdej pozycji nawigacji (klucz = NavItem.key).
 * Po zamknięciu modułu: zamień wpis na () => <Done labelKey="<etykieta z nawigacji>" /> (zob. mockups.md), a pliki ekranu zostaw.
 */
export const SCREENS: Record<string, ComponentType> = {
  home: HomeMockup,
  'my-account': MyAccountMockup,
  dashboard: DashboardMockup,
};
