import type { Pages } from './buildRoutes';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';
import { LoginPage } from '../../modules/login/LoginPage';
import { ChangePasswordPage } from '../../modules/login/ChangePasswordPage';

/** Ekran każdej pozycji nawigacji (klucz = NavItem.key). Nowy moduł dopisuje się tutaj. */
export const PAGES: Pages = {
  dashboard: DashboardPage,
  login: LoginPage,
  'change-password': ChangePasswordPage,
};
