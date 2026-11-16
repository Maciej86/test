import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { canSee, flattenNav, type NavItem, type SessionUser } from '@app/shared';
import { MissingScreen } from '../../common/MissingScreen';
import { NoAccess } from '../../common/NoAccess';

export type Pages = Record<string, ComponentType>;

/** Trasa dla każdej pozycji nawigacji (grupa z pozycjami pod sobą nie ma własnej strony); brak strony = MissingScreen, brak uprawnień = NoAccess. */
export const buildRoutes = (items: NavItem[], pages: Pages, user: SessionUser | null): RouteObject[] => {
  return flattenNav(items).filter((item) => !item.children).map((item) => {
    const Page = pages[item.key];
    let element = Page ? <Page /> : <MissingScreen />;
    if (!canSee(item, user)) element = <NoAccess />;
    return { path: item.path, element };
  });
};
