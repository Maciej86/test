import { useMemo, useState } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
import {
  ACCOUNT_NAVIGATION,
  AREAS,
  NAVIGATION,
  PUBLIC_NAVIGATION,
  canSee,
  flattenNav,
  type Areas,
  type NavItem,
  type PublicNavItem,
  type Role,
} from '@app/shared';
import { MissingScreen } from './common/MissingScreen';
import { MockupRoleContext } from './common/mockupRole';
import { ProgressPage } from './progress/ProgressPage';
import { EXTRA_SCREENS, SCREENS, type ExtraScreen } from './screens';
import { defaultRole, partOf, Shell, type Screens } from './Shell';

interface Props {
  areas?: Areas;
  navigation?: NavItem[];
  accountNavigation?: NavItem[];
  publicNavigation?: PublicNavItem[];
  screens?: Screens;
  /** Ekrany spoza menu aplikacji (np. logowanie), z linkiem w menu makiety. */
  extraScreens?: ExtraScreen[];
  /** Tylko w testach: adres startowy (pamięć zamiast paska adresu). */
  initialPath?: string;
}

export function MockupApp({
  areas = AREAS,
  navigation = NAVIGATION,
  accountNavigation = ACCOUNT_NAVIGATION,
  publicNavigation = PUBLIC_NAVIGATION,
  screens = SCREENS,
  extraScreens = EXTRA_SCREENS,
  initialPath,
}: Props) {
  // Bez strony dla odwiedzających adres / prowadzi do pierwszej włączonej części (konto albo panel).
  const homePath = areas.public ? null : areas.account ? '/account' : '/admin';
  const requestedPath = initialPath ?? window.location.pathname;
  const startPath = homePath && requestedPath === '/' ? homePath : requestedPath;
  const [role, setRole] = useState<Role>(defaultRole(partOf(startPath)));

  const router = useMemo(() => {
    const screenFor = (key: string, item?: NavItem) => {
      if (item && !canSee(item, { id: 0, name: 'Makieta', role, mustChangePassword: false })) {
        return <MissingScreen messageKey="mockup.role_cannot_see" />;
      }
      const Screen = screens[key];
      return Screen ? <Screen /> : <MissingScreen />;
    };
    const children: RouteObject[] = [
      ...(areas.public ? publicNavigation.map((i) => ({ path: i.path, element: screenFor(i.key) })) : []),
      ...(areas.account ? flattenNav(accountNavigation).map((i) => ({ path: i.path, element: screenFor(i.key, i) })) : []),
      ...(areas.admin ? flattenNav(navigation).map((i) => ({ path: i.path, element: screenFor(i.key, i) })) : []),
      ...(homePath ? [{ path: '/', element: <Navigate to={homePath} replace /> }] : []),
      ...extraScreens.map(({ path, screen: Screen }) => ({ path, element: <Screen /> })),
      { path: '/progress', element: <ProgressPage /> },
      { path: '*', element: <MissingScreen /> },
    ];
    const routes: RouteObject[] = [
      {
        element: (
          <MockupRoleContext.Provider value={role}>
          <Shell
            areas={areas}
            navigation={navigation}
            accountNavigation={accountNavigation}
            publicNavigation={publicNavigation}
            extraScreens={extraScreens}
            role={role}
            onRoleChange={setRole}
          >
            <Outlet />
          </Shell>
          </MockupRoleContext.Provider>
        ),
        children,
      },
    ];
    return initialPath ? createMemoryRouter(routes, { initialEntries: [initialPath] }) : createBrowserRouter(routes);
    // Router tworzony raz na zmianę roli; adres zostaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return <RouterProvider router={router} />;
}
