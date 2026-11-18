import { screen, waitFor } from '@testing-library/react';
import type { ProjectItem, SessionUser } from '@app/shared';
import { api } from '../../../core/api/client';
import { AuthProvider } from '../../../core/auth/AuthProvider';
import { renderRoutes } from '../../../test/render';
import { TasksHomePage } from '../TasksHomePage';

const project = (id: number): ProjectItem => ({ id, name: `P${id}`, position: id, members: [], openCount: 0, doneCount: 0, archivedCount: 0, createdAt: '2026-11-02' });

const show = (user: SessionUser, projects: ProjectItem[]) => {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => (url === '/auth/me' ? { data: { user } } : { data: { items: projects } }));
  return renderRoutes(
    [
      { path: '/admin/tasks', element: <AuthProvider><TasksHomePage /></AuthProvider> },
      { path: '/admin/tasks/:projectId', element: <p>Tablica</p> },
      { path: '/admin', element: <p>Pulpit</p> },
    ],
    '/admin/tasks',
  );
};

afterEach(() => vi.restoreAllMocks());

describe('TasksHomePage', () => {
  it('goes to the first visible project', async () => {
    const { router } = show({ id: 5, name: 'Jan', role: 'employee', mustChangePassword: false }, [project(4), project(7)]);
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/tasks/4'));
  });

  it('an employee without projects goes to the dashboard, the admin to the project list', async () => {
    const employee = show({ id: 5, name: 'Jan', role: 'employee', mustChangePassword: false }, []);
    await waitFor(() => expect(employee.router.state.location.pathname).toBe('/admin'));
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
    employee.unmount();
    const admin = show({ id: 1, name: 'Anna', role: 'admin', mustChangePassword: false }, []);
    await waitFor(() => expect(admin.router.state.location.pathname).toBe('/admin/tasks/projects'));
  });
});
