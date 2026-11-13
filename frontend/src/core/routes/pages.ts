import type { Pages } from './buildRoutes';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';

/** Ekran każdej pozycji nawigacji (klucz = NavItem.key). Nowy moduł dopisuje się tutaj. */
export const PAGES: Pages = {
  dashboard: DashboardPage,
};
