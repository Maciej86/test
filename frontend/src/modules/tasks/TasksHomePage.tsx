import { Navigate } from 'react-router';
import { TASK_PROJECTS_PATH, taskBoardPath } from '@app/shared';
import { DataState } from '../../common/DataState';
import { useAuth } from '../../core/auth/AuthProvider';
import { useProjects } from './tasks.api';

/**
 * Sam adres „Zadania” (np. ze starego powiadomienia): tablica pierwszego widocznego projektu; bez projektów
 * administrator trafia na listę projektów, pracownik na Pulpit.
 */
export const TasksHomePage = () => {
  const { user } = useAuth();
  const projects = useProjects(user !== null);
  const first = projects.data?.items[0];
  return (
    <DataState query={projects}>
      {projects.data && (
        <Navigate to={first ? taskBoardPath(first.id) : user?.role === 'admin' ? TASK_PROJECTS_PATH : '/admin'} replace />
      )}
    </DataState>
  );
};
