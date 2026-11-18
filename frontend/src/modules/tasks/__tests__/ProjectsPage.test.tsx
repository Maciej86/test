import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderRoutes } from '../../../test/render';
import { ProjectsPage } from '../ProjectsPage';

const projects: ProjectItem[] = [
  { id: 1, name: 'Marketing', position: 1, createdAt: '2026-11-02T10:00:00.000Z', openCount: 3, doneCount: 1, archivedCount: 2, members: [{ id: 5, name: 'Jan Kowalski', archived: false, openTasks: 2 }] },
  { id: 2, name: 'Produkcja', position: 2, createdAt: '2026-11-04T10:00:00.000Z', openCount: 0, doneCount: 0, archivedCount: 1, members: [] },
];

const show = (items: ProjectItem[] = projects, path = '/admin/tasks/projects') => {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) =>
    url === '/tasks/projects/candidates' ? { data: [{ id: 5, name: 'Jan Kowalski' }, { id: 6, name: 'Piotr Zieliński' }] } : { data: { items } },
  );
  vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
  vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
  vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true, deletedTasks: 0 } });
  return renderRoutes(
    [
      { path: '/admin/tasks/projects', element: <ProjectsPage /> },
      { path: '/admin/tasks/:projectId', element: <p>Tablica</p> },
    ],
    path,
  );
};

afterEach(() => vi.restoreAllMocks());

describe('ProjectsPage', () => {
  it('table with arrows, members and task counts; arrows move the project', async () => {
    show();
    const row = (await screen.findByRole('link', { name: 'Marketing' })).closest('tr') as HTMLElement;
    expect(within(row).getByText('1 osoba')).toBeInTheDocument();
    expect(within(row).getByText('3 otwarte')).toBeInTheDocument();
    expect(within(row).getByText('1 zrealizowane')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'Produkcja' }).closest('tr') as HTMLElement).getByText('tylko administratorzy')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Przesuń niżej' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tasks/projects/1/move', { direction: 'down' }));
  });

  it('empty list invites to add the first project', async () => {
    show([]);
    expect(await screen.findByText('Nie ma jeszcze projektów')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj projekt' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('duplicate name shows an error under the field', async () => {
    show();
    vi.mocked(api.post).mockRejectedValue(Object.assign(new Error('409'), {
      isAxiosError: true,
      response: { status: 409, data: { error: { message: 'tasks.project_name_taken', fields: { name: 'tasks.project_name_taken' } } } },
    }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dodaj projekt' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Nazwa/ }), { target: { value: 'marketing' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dodaj projekt' }));
    expect(await within(dialog).findByText('Projekt o tej nazwie już jest.')).toBeInTheDocument();
  });

  it('removing a member with open tasks shows the warning', async () => {
    show();
    const row = (await screen.findByRole('link', { name: 'Marketing' })).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Edytuj' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Jan Kowalski')).toBeInTheDocument();
    fireEvent.keyDown(dialog.querySelector('.mantine-MultiSelect-inputField') as HTMLElement, { key: 'Backspace' });
    await waitFor(() => expect(within(dialog).getByText(/Jan Kowalski ma 2 otwarte zadania w tym projekcie/)).toBeInTheDocument());
  });

  it('delete button enabled only after typing the exact name', async () => {
    show();
    const row = (await screen.findByRole('link', { name: 'Produkcja' })).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Usuń' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Projekt „Produkcja” zniknie na stałe razem z 1 zadaniem i jego komentarzami. Tego nie da się cofnąć.')).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Usuń na stałe' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Produkcja' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/tasks/projects/2', { data: { confirmName: 'Produkcja' } }));
  });
});
