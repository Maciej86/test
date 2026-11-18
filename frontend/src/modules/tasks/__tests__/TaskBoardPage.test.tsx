import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { BoardResponse, BoardTask, SessionUser } from '@app/shared';
import { api } from '../../../core/api/client';
import { AuthProvider } from '../../../core/auth/AuthProvider';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { TaskBoardPage } from '../TaskBoardPage';

const jan: SessionUser = { id: 5, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };
const task = (id: number, column: BoardTask['column'], o: Partial<BoardTask> = {}): BoardTask => ({
  id, title: `Zadanie ${id}`, description: null, dueDate: null, column, position: id, completedAt: column === 'done' ? '2026-11-17T10:00:00.000Z' : null, finishedAt: null,
  createdByName: 'Anna Nowak', createdAt: '2026-11-05T10:00:00.000Z', assigneeIds: [], leaves: [], ...o,
});
const board = (o: Partial<BoardResponse> = {}): BoardResponse => ({
  project: { id: 9, name: 'Marketing' },
  people: [{ id: 5, name: 'Jan Kowalski', role: 'employee', archived: false, assignable: true }],
  tasks: [
    task(1, 'draft', { title: 'Ulotki na targi', assigneeIds: [5] }),
    task(2, 'draft'),
    task(3, 'in_progress', { dueDate: '2026-11-10' }),
    task(4, 'in_progress'),
    task(5, 'done'),
  ],
  oldDoneCount: 2,
  leaves: [{ userId: 5, dateFrom: '2026-11-23', dateTo: '2026-11-27' }],
  ...o,
});

const setPhone = (phone: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: phone, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const show = (data: BoardResponse | 'missing', path = '/admin/tasks/9', user: SessionUser = jan) => {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { user } };
    if (url === '/tasks/projects') return { data: { items: [{ id: 9, name: 'Marketing', position: 1, members: [], openCount: 4, doneCount: 1, archivedCount: 0, createdAt: '2026-11-02' }] } };
    if (url === '/tasks/projects/candidates') return { data: [] };
    if (data === 'missing') throw Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404, data: { error: { message: 'server.not_found' } } } });
    return { data };
  });
  vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
  return renderRoutes(
    [
      { path: '/admin/tasks/:projectId', element: <AuthProvider><TaskBoardPage /></AuthProvider> },
      { path: '/admin', element: <p>Pulpit</p> },
    ],
    path,
  );
};

beforeEach(() => {
  setPhone(false);
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TaskBoardPage', () => {
  it('empty project shows the invitation to add the first task', async () => {
    show(board({ tasks: [], oldDoneCount: 0 }));
    expect(await screen.findByText('Tablica jest pusta')).toBeInTheDocument();
    expect(screen.getByText('Na tablicy nie ma jeszcze zadań')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dodaj zadanie' }).length).toBeGreaterThan(0);
  });

  it('404 shows no access with a link to the dashboard; a project number not made of digits too', async () => {
    const { unmount } = show('missing');
    expect(await screen.findByText('Nie masz dostępu do tego projektu albo projekt został usunięty.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Wróć na Pulpit' }));
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
    unmount();
    show(board(), '/admin/tasks/1e3');
    expect(await screen.findByText('Nie masz dostępu do tego projektu albo projekt został usunięty.')).toBeInTheDocument();
  });

  it('header with the project name, open and overdue counts; three columns with counts', async () => {
    show(board());
    expect(await screen.findByRole('heading', { name: 'Marketing' })).toBeInTheDocument();
    expect(screen.getByText('4 zadania w opracowaniu i w toku, 1 po terminie')).toBeInTheDocument();
    const draft = screen.getByRole('region', { name: 'W opracowaniu' });
    expect(within(draft).getByText('Ulotki na targi')).toBeInTheDocument();
    expect(within(draft).getByText('2')).toBeInTheDocument();
  });

  it('search and only mine are kept in the address and filter the cards', async () => {
    const { router } = show(board());
    await screen.findByText('Ulotki na targi');
    fireEvent.click(screen.getByRole('switch', { name: 'Tylko moje zadania' }));
    await waitFor(() => expect(router.state.location.search).toBe('?mine=true'));
    expect(screen.queryByText('Zadanie 2')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'W opracowaniu' })).getByText('1 / 2')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'W toku' })).getByText('Brak pasujących zadań.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Szukaj zadania' }), { target: { value: 'ulotki' } });
    await waitFor(() => expect(router.state.location.search).toBe('?search=ulotki&mine=true'));
  });

  it('show older done fetches with oldDone', async () => {
    show(board());
    fireEvent.click(await screen.findByRole('button', { name: 'Pokaż starsze zrealizowane (2)' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/tasks/projects/9/board', { params: { oldDone: '1' } }));
  });

  it('move menu calls the move with the end of the column', async () => {
    show(board());
    const card = (await screen.findByText('Zadanie 4')).closest('.mantine-Card-root') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Więcej działań' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Zrealizowane' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tasks/4/move', { column: 'done', beforeTaskId: null }));
  });

  it('phone shows one column, In progress first', async () => {
    setPhone(true);
    show(board());
    expect(await screen.findByText('Zadanie 3')).toBeInTheDocument();
    expect(screen.queryByText('Ulotki na targi')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'W toku (2)' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'W opracowaniu (2)' }));
    expect(await screen.findByText('Ulotki na targi')).toBeInTheDocument();
  });

  it('the task in the address opens the drawer; an unknown one shows a message', async () => {
    const { unmount } = show(board(), '/admin/tasks/9?task=3');
    expect(await screen.findByText('Zadanie: Marketing')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Tytuł/ })).toHaveValue('Zadanie 3');
    unmount();
    const error = vi.spyOn(notify, 'error');
    const { router } = show(board(), '/admin/tasks/9?task=99');
    await waitFor(() => expect(error).toHaveBeenCalledWith('Nie znaleziono zadania.'));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('clicking a card opens the drawer through the address; Dodaj zadanie opens the window', async () => {
    const { router } = show(board());
    fireEvent.click(await screen.findByText('Zadanie 2'));
    await waitFor(() => expect(router.state.location.search).toBe('?task=2'));
    expect(await screen.findByText('Zadanie: Marketing')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Dodaj zadanie' })[0]!);
    expect(await screen.findByText('Nowe zadanie: Marketing')).toBeInTheDocument();
  });

  it('Usuń from the card menu asks first, then archives', async () => {
    show(board());
    const card = (await screen.findByText('Zadanie 4')).closest('.mantine-Card-root') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Więcej działań' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Usuń' }));
    expect(await screen.findByText('Usunąć zadanie?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tasks/4/archive'));
  });

  it('only the admin sees Edytuj projekt, which opens the project window', async () => {
    const { unmount } = show(board());
    await screen.findByText('Ulotki na targi');
    expect(screen.queryByRole('button', { name: 'Edytuj projekt' })).not.toBeInTheDocument();
    unmount();
    show(board(), '/admin/tasks/9', { id: 1, name: 'Anna Nowak', role: 'admin', mustChangePassword: false });
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj projekt' }));
    expect(await screen.findByText('Projekt: Marketing')).toBeInTheDocument();
  });

  it('a failed background refresh keeps the board and the open drawer with typed values', async () => {
    let fail = false;
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/auth/me') return { data: { user: jan } };
      if (fail) throw Object.assign(new Error('503'), { isAxiosError: true, response: { status: 503, data: { error: { message: 'server.unavailable' } } } });
      return { data: board() };
    });
    renderRoutes([{ path: '/admin/tasks/:projectId', element: <AuthProvider><TaskBoardPage /></AuthProvider> }], '/admin/tasks/9?task=3');
    const title = await screen.findByRole('textbox', { name: /Tytuł/ });
    fireEvent.change(title, { target: { value: 'Wpisane przed awarią' } });
    fail = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(await screen.findByText('Nie udało się odświeżyć tablicy. Spróbuję ponownie za chwilę.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Tytuł/ })).toHaveValue('Wpisane przed awarią');
  });

  it('Oznacz jako zakończone from the card menu sends the flag', async () => {
    show(board());
    const card = (await screen.findByText('Zadanie 4')).closest('.mantine-Card-root') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Więcej działań' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Oznacz jako zakończone' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tasks/4/finish', { finished: true }));
  });
});
