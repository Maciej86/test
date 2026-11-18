import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ProjectItem, SessionUser } from '@app/shared';
import { api } from '../../api/client';
import { AuthProvider, useAuth } from '../../auth/AuthProvider';
import { NavMenu } from '../../../common/NavMenu';
import { useAppNavigation } from '../useAppNavigation';
import { renderWithProviders } from '../../../test/render';

const project = (id: number, name: string): ProjectItem => ({ id, name, position: id, members: [], openCount: 0, doneCount: 0, archivedCount: 0, createdAt: '2026-11-02' });

const Menu = () => {
  const { user } = useAuth();
  return <NavMenu items={useAppNavigation()} user={user} />;
};

const show = (user: SessionUser, projects: ProjectItem[]) => {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { user } };
    if (url === '/tasks/projects') return { data: { items: projects } };
    throw new Error(url);
  });
  renderWithProviders(
    <MemoryRouter initialEntries={['/admin/tasks/3']}>
      <AuthProvider>
        <Menu />
      </AuthProvider>
    </MemoryRouter>,
  );
};

afterEach(() => vi.restoreAllMocks());

describe('useAppNavigation', () => {
  it('an employee with two projects sees Zadania with both, without Projekty', async () => {
    show({ id: 5, name: 'Jan', role: 'employee', mustChangePassword: false }, [project(3, 'Marketing'), project(4, 'Produkcja')]);
    expect(await screen.findByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Produkcja')).toBeInTheDocument();
    expect(screen.getByText('Zadania')).toBeInTheDocument();
    expect(screen.queryByText('Projekty')).not.toBeInTheDocument();
  });

  it('an employee without projects does not see Zadania', async () => {
    show({ id: 5, name: 'Jan', role: 'employee', mustChangePassword: false }, []);
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
    expect(screen.queryByText('Zadania')).not.toBeInTheDocument();
  });

  it('the admin sees the projects and then Projekty', async () => {
    show({ id: 1, name: 'Anna', role: 'admin', mustChangePassword: false }, [project(3, 'Marketing')]);
    // Grupa z bieżącym projektem jest rozwinięta, także gdy projekty doszły po pierwszym wyświetleniu menu.
    expect(await screen.findByRole('link', { name: 'Marketing' })).toBeVisible();
    const labels = screen.getAllByRole('link').map((a) => a.textContent?.trim());
    expect(labels.indexOf('Marketing')).toBeLessThan(labels.indexOf('Projekty'));
  });
});
