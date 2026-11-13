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
    routes.push({ element: <AccountLayout />, children: buildRoutes(ACCOUNT_NAVIGATION, pages, user) });
  }
  if (areas.admin) {
    routes.push({ element: <AppLayout />, children: buildRoutes(NAVIGATION, pages, user) });
  }

  routes.push({ path: '*', element: <MissingScreen /> });
  return routes;
}
