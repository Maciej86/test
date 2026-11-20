import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ArchivedEmployee, ArchivedTasksResponse, ListResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { ArchivePage } from '../ArchivePage';

const olga: ArchivedEmployee = {
  id: 9, name: 'Olga Testowa', login: 'olga@firma.pl', role: 'employee', archivedAt: '2026-11-03T08:40:00.000Z', archivedByName: 'Anna Nowak', leaveRequests: 0, tasks: 2,
};
const robert: ArchivedEmployee = { ...olga, id: 4, name: 'Robert Kamiński', login: 'robert@firma.pl', leaveRequests: 7, tasks: 0, archivedByName: null };
const employees = (items: ArchivedEmployee[]): ListResponse<ArchivedEmployee> => ({ items, total: items.length, page: 1, pageSize: 25 });
const noTasks: ArchivedTasksResponse = { items: [], total: 0, page: 1, pageSize: 25, projects: [] };

const show = (people: ArchivedEmployee[], path = '/admin/archive') => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/archive/counts') return { data: { employees: people.length, tasks: 4 } };
    if (url === '/archive/employees') return { data: employees(people) };
    return { data: noTasks };
  });
  const view = renderRoutes([{ path: '/admin/archive', element: <ArchivePage /> }], path);
  return { get, ...view };
};

afterEach(() => vi.restoreAllMocks());

describe('ArchivePage', () => {
  it('shows both tabs with counts', async () => {
    show([olga, robert]);
    expect(await screen.findByRole('tab', { name: 'Pracownicy (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Zadania (4)' })).toBeInTheDocument();
  });

  it('employees: rows with login, role, history and who archived', async () => {
    show([olga, robert]);
    const table = await screen.findByRole('table');
    const row = within(table).getByText('Olga Testowa').closest('tr')!;
    expect(within(row).getByText('olga@firma.pl')).toBeInTheDocument();
    expect(within(row).getByText('Pracownik')).toBeInTheDocument();
    expect(within(row).getByText('bez wniosków urlopowych')).toBeInTheDocument();
    expect(within(row).getByText('2 zadania')).toBeInTheDocument();
    expect(within(row).getByText('03.11.2026')).toBeInTheDocument();
    expect(within(row).getByText('przeniósł(a): Anna Nowak')).toBeInTheDocument();
    expect(within(within(table).getByText('Robert Kamiński').closest('tr')!).getByText('7 wniosków urlopowych')).toBeInTheDocument();
  });

  it('employees: empty archive and no results', async () => {
    show([]);
    expect(await screen.findByText('Nikogo nie ma w archiwum')).toBeInTheDocument();
    vi.restoreAllMocks();
    show([], '/admin/archive?search=kowal');
    expect(await screen.findByText('Nic nie pasuje do wyszukiwania. Zmień tekst albo projekt.')).toBeInTheDocument();
  });

  it('employees: delete disabled for a person with leave requests', async () => {
    show([olga, robert]);
    const table = await screen.findByRole('table');
    expect(within(within(table).getByText('Robert Kamiński').closest('tr')!).getByRole('button', { name: 'Usuń na stałe' })).toBeDisabled();
    expect(within(within(table).getByText('Olga Testowa').closest('tr')!).getByRole('button', { name: 'Usuń na stałe' })).toBeEnabled();
  });

  it('employees: delete window sends confirmName and shows a message', async () => {
    show([olga]);
    const success = vi.spyOn(notify, 'success');
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true } });
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: 'Usuń na stałe' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/zniknie też z przypisań w 2 zadania/i)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Wpisz imię i nazwisko, żeby potwierdzić'), { target: { value: 'Olga Testowa' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń na stałe' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/archive/employees/9', { data: { confirmName: 'Olga Testowa' } }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Usunięto na stałe: Olga Testowa.'));
  });

  it('employees: restore asks first, then restores', async () => {
    show([olga]);
    const success = vi.spyOn(notify, 'success');
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: 'Przywróć' }));
    const dialog = await screen.findByRole('dialog', { name: 'Przywrócić konto?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Przywróć' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/archive/employees/9/restore'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Przywrócono konto: Olga Testowa.'));
  });

  it('employees: 404 or 409 from the server shows the gone message and closes the window', async () => {
    show([olga]);
    const error = vi.spyOn(notify, 'error');
    vi.spyOn(api, 'post').mockRejectedValue(Object.assign(new Error('409'), {
      isAxiosError: true, response: { status: 409, data: { error: { message: 'employees.server.not_archived' } } },
    }));
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Przywróć' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Przywróć' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Tej rzeczy nie ma już w archiwum. Lista została odświeżona.'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.todo('tasks: project filter and search in the address');
  it.todo('tasks: clicking a row opens the read-only preview');
  it.todo('tasks: taskId in the address opens the preview; missing task shows the gone message');
  it.todo('tasks: restore window names the column');
});
