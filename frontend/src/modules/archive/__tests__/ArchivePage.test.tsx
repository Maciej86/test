import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ArchivedEmployee, ArchivedTask, ArchivedTaskDetails, ArchivedTasksResponse, ListResponse } from '@app/shared';
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

  it('employees: an empty page 2 (last person restored) goes back to page 1, not to the empty state', async () => {
    const { router } = show([], '/admin/archive?page=2');
    await waitFor(() => expect(router.state.location.search).not.toContain('page=2'));
  });

  it('employees: delete blocked for a person with leave requests, with an explanation', async () => {
    show([olga, robert]);
    const table = await screen.findByRole('table');
    const blocked = within(within(table).getByText('Robert Kamiński').closest('tr')!).getByRole('button', { name: 'Usuń na stałe' });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(blocked);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseEnter(blocked);
    expect(await screen.findByText('Ma wnioski urlopowe, więc zostaje w archiwum: historia urlopów musi zostać.')).toBeInTheDocument();
    expect(within(within(table).getByText('Olga Testowa').closest('tr')!).getByRole('button', { name: 'Usuń na stałe' })).not.toHaveAttribute('aria-disabled');
  });

  it('employees: another error (e.g. leave requests appeared) keeps the window open with the message', async () => {
    show([olga]);
    const error = vi.spyOn(notify, 'error');
    vi.spyOn(api, 'delete').mockRejectedValue(Object.assign(new Error('409'), {
      isAxiosError: true, response: { status: 409, data: { error: { message: 'archive.server.has_leave_requests' } } },
    }));
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Usuń na stałe' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Wpisz imię i nazwisko, żeby potwierdzić'), { target: { value: 'Olga Testowa' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń na stałe' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Ta osoba ma wnioski urlopowe, więc zostaje w archiwum: historia urlopów musi zostać.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
});

const spot: ArchivedTask = {
  id: 31, title: 'Spotkanie z dostawcą', projectId: 3, projectName: 'Biuro', column: 'in_progress', dueDate: '2026-11-28', comments: 2,
  archivedAt: '2026-11-10T07:47:00.000Z', archivedByName: 'Tomasz Wójcik',
};
const details: ArchivedTaskDetails = {
  ...spot, description: 'Ceny na 2027', assignees: [{ name: 'Robert Kamiński', archived: true }],
  commentsList: [{ id: 5, authorName: 'Ewa Mazurek', authorArchived: false, createdAt: '2026-11-08T09:14:00.000Z', text: 'Przesuwamy na grudzień' }],
};
const tasksPage: ArchivedTasksResponse = { items: [spot], total: 1, page: 1, pageSize: 25, projects: [{ id: 3, name: 'Biuro' }, { id: 4, name: 'Targi' }] };

const showTasks = (path = '/admin/archive?tab=tasks', task: ArchivedTaskDetails | null = details) => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/archive/counts') return { data: { employees: 0, tasks: 1 } };
    if (url === '/archive/tasks') return { data: tasksPage };
    if (url === '/archive/tasks/31' && task) return { data: task };
    throw Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404, data: { error: { message: 'server.not_found' } } } });
  });
  const view = renderRoutes([{ path: '/admin/archive', element: <ArchivePage /> }], path);
  return { get, ...view };
};

describe('ArchivePage, tasks', () => {
  it('tasks: rows with comments, project, column and due date', async () => {
    showTasks();
    const row = within(await screen.findByRole('table')).getByText('Spotkanie z dostawcą').closest('tr')!;
    expect(within(row).getByText('2 komentarze')).toBeInTheDocument();
    expect(within(row).getByText('Biuro')).toBeInTheDocument();
    expect(within(row).getByText('W toku')).toBeInTheDocument();
    expect(within(row).getByText('28.11.2026')).toBeInTheDocument();
    expect(within(row).getByText('przeniósł(a): Tomasz Wójcik')).toBeInTheDocument();
  });

  it('tasks: project filter goes to the address and the request', async () => {
    const { get, router } = showTasks();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('combobox', { name: 'Projekt' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Targi' }));
    await waitFor(() => expect(router.state.location.search).toContain('projectId=4'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/archive/tasks', { params: { page: 1, search: '', projectId: 4 } }));
  });

  it('tasks: the title is a button, so the preview opens from the keyboard too', async () => {
    const { router } = showTasks();
    const title = within(await screen.findByRole('table')).getByRole('button', { name: 'Spotkanie z dostawcą' });
    title.focus();
    fireEvent.click(title);
    await waitFor(() => expect(router.state.location.search).toContain('taskId=31'));
  });

  it('tasks: clicking a row opens the read-only preview with comments', async () => {
    const { router } = showTasks();
    fireEvent.click(within(await screen.findByRole('table')).getByText('Spotkanie z dostawcą'));
    await waitFor(() => expect(router.state.location.search).toContain('taskId=31'));
    const drawer = await screen.findByRole('dialog', { name: 'Zadanie w archiwum' });
    expect(await within(drawer).findByText('Ceny na 2027')).toBeInTheDocument();
    expect(within(drawer).getByText('Zadanie w archiwum można tylko obejrzeć. Żeby je zmienić, najpierw je przywróć.')).toBeInTheDocument();
    expect(within(drawer).getByText('Robert Kamiński')).toBeInTheDocument();
    expect(within(drawer).getByText('w archiwum')).toBeInTheDocument();
    expect(within(drawer).getByText('Przesuwamy na grudzień')).toBeInTheDocument();
    expect(within(drawer).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('tasks: an empty page 2 goes back to page 1', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/archive/counts') return { data: { employees: 0, tasks: 25 } };
      return { data: { ...tasksPage, items: [], total: 25 } };
    });
    const { router } = renderRoutes([{ path: '/admin/archive', element: <ArchivePage /> }], '/admin/archive?tab=tasks&page=2');
    await waitFor(() => expect(router.state.location.search).toBe('?tab=tasks'));
    expect(screen.queryByText('Żadnego zadania nie ma w archiwum')).not.toBeInTheDocument();
  });

  it('tasks: opening and closing the preview keeps the page of the list', async () => {
    const { router } = showTasks('/admin/archive?tab=tasks&page=2');
    fireEvent.click(within(await screen.findByRole('table')).getByText('Spotkanie z dostawcą'));
    await waitFor(() => expect(router.state.location.search).toContain('taskId=31'));
    expect(router.state.location.search).toContain('page=2');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Zadanie w archiwum' })).getByRole('button', { name: 'Zamknij' }));
    await waitFor(() => expect(router.state.location.search).not.toContain('taskId'));
    expect(router.state.location.search).toContain('page=2');
  });

  it('tasks: taskId in the address opens the preview; a missing task shows the gone message and clears the address', async () => {
    const error = vi.spyOn(notify, 'error');
    const { router } = showTasks('/admin/archive?tab=tasks&taskId=77');
    await waitFor(() => expect(error).toHaveBeenCalledWith('Tej rzeczy nie ma już w archiwum. Lista została odświeżona.'));
    await waitFor(() => expect(router.state.location.search).not.toContain('taskId'));
  });

  it('tasks: restore from the preview names the column; delete names the comments', async () => {
    showTasks('/admin/archive?tab=tasks&taskId=31');
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const drawer = await screen.findByRole('dialog', { name: 'Zadanie w archiwum' });
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Przywróć' }));
    const confirm = await screen.findByRole('dialog', { name: 'Przywrócić zadanie?' });
    expect(within(confirm).getByText('„Spotkanie z dostawcą” wróci na tablicę projektu Biuro, na koniec kolumny „W toku”.')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Przywróć' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/archive/tasks/31/restore'));
  });

  it('tasks: delete window names the comments that disappear', async () => {
    showTasks();
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true } });
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Usuń na stałe' }));
    const confirm = await screen.findByRole('dialog', { name: 'Usunąć zadanie na stałe?' });
    expect(within(confirm).getByText('Razem z nim znikną 2 komentarze.')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Usuń na stałe' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/archive/tasks/31'));
  });
});
