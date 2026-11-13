import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { canSee, flattenNav, type NavItem, type SessionUser } from '@app/shared';
import { MissingScreen } from '../../common/MissingScreen';
import { NoAccess } from '../../common/NoAccess';

export type Pages = Record<string, ComponentType>;

/** Trasa dla każdej pozycji nawigacji; brak strony = MissingScreen, brak uprawnień = NoAccess. */
export function buildRoutes(items: NavItem[], pages: Pages, user: SessionUser | null): RouteObject[] {
  return flattenNav(items).map((item) => {
    const Page = pages[item.key];
    let element = Page ? <Page /> : <MissingScreen />;
    if (!canSee(item, user)) element = <NoAccess />;
    return { path: item.path, element };
  });
}
