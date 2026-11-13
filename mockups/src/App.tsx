import { useMemo, useState } from 'react';
import { createBrowserRouter, createMemoryRouter, Outlet, RouterProvider, type RouteObject } from 'react-router';
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
import { SCREENS } from './screens';
import { defaultRole, partOf, Shell, type Screens } from './Shell';

interface Props {
  areas?: Areas;
  navigation?: NavItem[];
  accountNavigation?: NavItem[];
  publicNavigation?: PublicNavItem[];
  screens?: Screens;
  /** Tylko w testach: adres startowy (pamięć zamiast paska adresu). */
  initialPath?: string;
}

export function MockupApp({
  areas = AREAS,
  navigation = NAVIGATION,
  accountNavigation = ACCOUNT_NAVIGATION,
  publicNavigation = PUBLIC_NAVIGATION,
  screens = SCREENS,
  initialPath,
}: Props) {
  const startPath = initialPath ?? window.location.pathname;
  const [role, setRole] = useState<Role>(defaultRole(partOf(startPath)));

  const router = useMemo(() => {
    const screenFor = (key: string, item?: NavItem) => {
      if (item && !canSee(item, { id: 0, name: 'Makieta', role })) {
        return <MissingScreen messageKey="mockup.role_cannot_see" />;
      }
      const Screen = screens[key];
      return Screen ? <Screen /> : <MissingScreen />;
    };
    const children: RouteObject[] = [
      ...(areas.public ? publicNavigation.map((i) => ({ path: i.path, element: screenFor(i.key) })) : []),
      ...(areas.account ? flattenNav(accountNavigation).map((i) => ({ path: i.path, element: screenFor(i.key, i) })) : []),
      ...(areas.admin ? flattenNav(navigation).map((i) => ({ path: i.path, element: screenFor(i.key, i) })) : []),
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
