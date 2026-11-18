import type { ComponentType } from 'react';
import type { NavItem } from '@app/shared';
import { MOCK_USER_NAMES } from '../../common/mockUsers';
import { ProjectsMockup } from './ProjectsMockup';
import { TasksMockup } from './TasksMockup';
import { PROJECTS } from './data';

/**
 * Makieta menu „Zadania”: przed stałą pozycją „Projekty” z navigation.config.ts dokłada projekty (pracownik widzi
 * tylko swoje). W aplikacji robi to useAppNavigation z projektami z serwera; tu są zmyślone z data.ts.
 */
export const withTaskProjects = (items: NavItem[]): NavItem[] =>
  items.map((item) =>
    item.key !== 'tasks'
      ? item
      : {
          ...item,
          children: [
            ...PROJECTS.map((p): NavItem => ({
              key: `task-project-${p.id}`,
              path: `/admin/tasks/${p.id}`,
              label: item.label,
              text: p.name,
              icon: 'folder',
              roles: p.members.includes(MOCK_USER_NAMES.employee ?? '') ? ['admin', 'employee'] : ['admin'],
            })),
            ...(item.children ?? []),
          ],
        },
  );

/** Ekrany pozycji z `withTaskProjects` i grupy „Zadania” (klucz = NavItem.key). */
export const TASK_SCREENS: Record<string, ComponentType> = {
  ...Object.fromEntries(PROJECTS.map((p) => [`task-project-${p.id}`, () => <TasksMockup key={p.id} projectId={p.id} />])),
  'task-projects': ProjectsMockup,
};
