import { Navigate, useLocation, type RouteObject } from 'react-router';
import {
  ACCOUNT_NAVIGATION,
  NAVIGATION,
  PUBLIC_NAVIGATION,
  ROLE_HOME,
  type Areas,
  type SessionUser,
} from '@app/shared';
import { AccountLayout } from '../../common/AccountLayout';
import { AppLayout } from '../../common/AppLayout';
import { MissingScreen } from '../../common/MissingScreen';
import { PublicLayout } from '../../common/PublicLayout';
import { buildRoutes, type Pages } from './buildRoutes';
import { PASSWORD_CHANGE_PATH } from '../../config/constants';
import { NOTIFICATIONS_PATH } from '@app/shared';
import type { ReactElement } from 'react';

/**
 * Niezalogowany → /login z adresem powrotu (`?next=`), np. po kliknięciu linku w e-mailu. Sam panel (`/admin`)
 * bez `next`, bo i tak jest domyślnym ekranem po zalogowaniu. Czy adres jest bezpieczny, sprawdza ekran logowania.
 */
const RedirectToLogin = () => {
  const { pathname, search } = useLocation();
  const target = pathname + search;
  const home = pathname === '/admin' || pathname === '/admin/';
  return <Navigate to={home ? '/login' : `/login?next=${encodeURIComponent(target)}`} replace />;
};

/**
 * Konto i panel tylko dla zalogowanych: niezalogowany trafia na /login, osoba z hasłem tymczasowym na ustawienie
 * własnego hasła (serwer i tak odrzuci jej zapytania, ale tak nie zobaczy nawet pustych ekranów).
 */
const guarded = (layout: ReactElement, user: SessionUser | null): ReactElement => {
  if (!user) return <RedirectToLogin />;
  if (user.mustChangePassword) return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  return layout;
};

/** Wszystkie trasy aplikacji według włączonych części (AREAS). */
export const buildAppRoutes = (areas: Areas, pages: Pages, user: SessionUser | null): RouteObject[] => {
  const routes: RouteObject[] = [];

  if (areas.public) {
    routes.push({
      element: <PublicLayout areas={areas} />,
      children: [
        ...PUBLIC_NAVIGATION.map((item) => {
          const Page = pages[item.key];
          return { path: item.path, element: Page ? <Page /> : <MissingScreen /> };
        }),
        // Ekran logowania powstaje w module Logowanie.
        { path: '/login', element: pages.login ? <pages.login /> : <MissingScreen /> },
      ],
    });
  } else {
    routes.push({ path: '/', element: <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace /> });
    routes.push({ path: '/login', element: pages.login ? <pages.login /> : <MissingScreen /> });
  }

  if (areas.account) {
    routes.push({ element: guarded(<AccountLayout />, user), children: buildRoutes(ACCOUNT_NAVIGATION, pages, user) });
  }
  if (areas.admin) {
    // Strony panelu bez pozycji w menu, dla każdej zalogowanej roli: „Powiadomienia” (z dzwonka).
    const Notifications = pages.notifications;
    const unlisted = [{ path: NOTIFICATIONS_PATH, element: Notifications ? <Notifications /> : <MissingScreen /> }];
    routes.push({ element: guarded(<AppLayout />, user), children: [...buildRoutes(NAVIGATION, pages, user), ...unlisted] });
    // Każdy inny adres w panelu (np. /admin/leave-requests/128 z e-maila): niezalogowany też trafia na logowanie.
    if (!user) routes.push({ path: '/admin/*', element: <RedirectToLogin /> });
  }

  if (areas.account || areas.admin) {
    const ChangePassword = pages['change-password'];
    routes.push({
      path: PASSWORD_CHANGE_PATH,
      element: !user ? <Navigate to="/login" replace /> : ChangePassword ? <ChangePassword /> : <MissingScreen />,
    });
  }

  routes.push({ path: '*', element: <MissingScreen /> });
  return routes;
};
