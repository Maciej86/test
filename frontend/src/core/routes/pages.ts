import type { Pages } from './buildRoutes';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';
import { HomePage } from '../../modules/home/HomePage';
import { MyAccountPage } from '../../modules/my-account/MyAccountPage';

/** Ekran każdej pozycji nawigacji (klucz = NavItem.key). Nowy moduł dopisuje się tutaj. */
export const PAGES: Pages = {
  home: HomePage,
  'my-account': MyAccountPage,
  dashboard: DashboardPage,
};
