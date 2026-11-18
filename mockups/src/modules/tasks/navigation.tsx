import type { ComponentType } from 'react';
import type { NavItem } from '@app/shared';
import { MOCK_USER_NAMES } from '../../common/mockUsers';
import { ProjectsMockup } from './ProjectsMockup';
import { TasksMockup } from './TasksMockup';
import { PROJECTS } from './data';

/**
 * Makieta menu „Zadania” z projektami: „Zadania” staje się grupą, pod nią projekty (pracownik widzi tylko swoje)
 * i „Projekty” dla administratora. W aplikacji projekty przyjdą z bazy; tu są zmyślone z data.ts.
 */
export const withTaskProjects = (items: NavItem[]): NavItem[] =>
  items.map((item) =>
    item.key !== 'tasks'
      ? item
      : {
          ...item,
          children: [
            ...PROJECTS.map((p): NavItem => ({
              key: `tasks-project-${p.id}`,
              path: `/admin/tasks/${p.id}`,
              label: `tasks.mockup_projects.${p.id}`,
              icon: 'folder',
              roles: p.members.includes(MOCK_USER_NAMES.employee ?? '') ? ['admin', 'employee'] : ['admin'],
            })),
            { key: 'tasks-projects', path: '/admin/tasks/projects', label: 'tasks.projects_title', icon: 'folder-cog', roles: ['admin'] },
          ],
        },
  );

/** Ekrany pozycji z `withTaskProjects` (klucz = NavItem.key). */
export const TASK_SCREENS: Record<string, ComponentType> = {
  ...Object.fromEntries(PROJECTS.map((p) => [`tasks-project-${p.id}`, () => <TasksMockup key={p.id} projectId={p.id} />])),
  'tasks-projects': ProjectsMockup,
};
