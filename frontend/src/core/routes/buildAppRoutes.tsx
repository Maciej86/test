import { Navigate, type RouteObject } from 'react-router';
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
import type { ReactElement } from 'react';

/**
 * Konto i panel tylko dla zalogowanych: niezalogowany trafia na /login, osoba z hasłem tymczasowym na ustawienie
 * własnego hasła (serwer i tak odrzuci jej zapytania, ale tak nie zobaczy nawet pustych ekranów).
 */
function guarded(layout: ReactElement, user: SessionUser | null): ReactElement {
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  return layout;
}

/** Wszystkie trasy aplikacji według włączonych części (AREAS). */
export function buildAppRoutes(areas: Areas, pages: Pages, user: SessionUser | null): RouteObject[] {
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
    routes.push({ element: guarded(<AppLayout />, user), children: buildRoutes(NAVIGATION, pages, user) });
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
}
