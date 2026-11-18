import { taskBoardPath, type NavItem } from '@app/shared';
import { useProjects } from './tasks.api';

/** Pozycje menu „Zadania”: projekty zalogowanej osoby (serwer zwraca tylko te, które widzi), w ich kolejności. */
export const useProjectNavItems = (loggedIn: boolean): NavItem[] => {
  const projects = useProjects(loggedIn);
  return (projects.data?.items ?? []).map((p) => ({
    key: `task-project-${p.id}`,
    path: taskBoardPath(p.id),
    label: 'common.nav.tasks',
    text: p.name,
    icon: 'folder',
    roles: ['admin', 'employee'],
  }));
};
