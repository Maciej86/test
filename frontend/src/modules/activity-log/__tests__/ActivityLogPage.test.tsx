import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { formatDate, type ActivityLogItem, type ActivityLogListResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderRoutes } from '../../../test/render';
import { ActivityLogPage } from '../ActivityLogPage';

const DAY_MS = 24 * 60 * 60 * 1000;
const item = (o: Partial<ActivityLogItem>): ActivityLogItem => ({
  id: 1,
  createdAt: new Date().toISOString(),
  userName: 'Anna Nowak',
  area: 'leave_requests',
  action: 'status',
  entityId: 21,
  entityName: 'Jan Kowalski',
  entityContext: { leaveType: 'Wypoczynkowy', from: '2026-12-22', to: '2026-12-31', days: 6 },
  changes: { status: { before: 'pending', after: 'approved' } },
  state: 'exists',
  link: '/admin/leave-requests/21',
  ...o,
});
const page = (items: ActivityLogItem[], o: Partial<ActivityLogListResponse> = {}): ActivityLogListResponse => ({
  items, total: items.length, page: 1, pageSize: 50, ...o,
});

const show = (data: ActivityLogListResponse, path = '/admin/activity-log') => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url: string) =>
    url === '/activity-log/people' ? { data: [{ userId: 1, userName: 'Anna Nowak' }, { userId: 3, userName: 'Ewa Mazur' }] } : { data },
  );
  return {
    get,
    ...renderRoutes(
      [
        { path: '/admin/activity-log', element: <ActivityLogPage /> },
        { path: '/admin/leave-requests/:id', element: <p>Szczegóły wniosku</p> },
      ],
      path,
    ),
  };
};

afterEach(() => vi.restoreAllMocks());

describe('ActivityLogPage', () => {
  it('shows entries grouped by day with count, description, context and author', async () => {
    const old = new Date(Date.now() - 5 * DAY_MS);
    show(page([
      item({ id: 3 }),
      item({ id: 2, area: 'tasks', action: 'status', entityName: 'Oferta', entityContext: { project: 'Marketing' }, changes: { column_key: { before: 'draft', after: 'done' } }, createdAt: new Date(Date.now() - DAY_MS).toISOString() }),
      item({ id: 1, area: 'projects', action: 'update', entityName: '', entityId: 9, entityContext: null, changes: {}, createdAt: old.toISOString() }),
    ], { total: 412 }));
    expect(await screen.findByText('Dzisiaj')).toBeInTheDocument();
    expect(screen.getByText('Wczoraj')).toBeInTheDocument();
    expect(screen.getByText(formatDate(old)!)).toBeInTheDocument();
    expect(screen.getByText('412 wpisów')).toBeInTheDocument();
    expect(screen.getByText('Zatwierdzenie wniosku')).toBeInTheDocument();
    expect(screen.getByText(/Wypoczynkowy, 22\.12\.2026–31\.12\.2026, dni: 6/)).toBeInTheDocument();
    expect(screen.getByText('Przeniesienie zadania')).toBeInTheDocument();
    expect(screen.getByText(/projekt Marketing/)).toBeInTheDocument();
    expect(screen.getByText('nr 9')).toBeInTheDocument();
    expect(screen.getAllByText('Anna Nowak').length).toBeGreaterThan(0);
  });

  it('filters are read from and written to the address', async () => {
    const { get, router } = show(page([item({})]), '/admin/activity-log?area=tasks&userId=3&from=2026-11-01&to=2026-11-20&search=kowal');
    await screen.findByText('Zatwierdzenie wniosku');
    expect(get).toHaveBeenCalledWith('/activity-log', { params: { page: 1, search: 'kowal', area: 'tasks', userId: 3, from: '2026-11-01', to: '2026-11-20' } });
    expect(screen.getByRole('combobox', { name: 'Obszar' })).toHaveValue('Zadania');
    expect(await screen.findByDisplayValue('Ewa Mazur')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Od dnia' })).toHaveValue('01.11.2026');
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    fireEvent.change(screen.getByRole('textbox', { name: 'Od dnia' }), { target: { value: '05.11.2026' } });
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-11-05'));
  });

  it('empty history and no results messages', async () => {
    show(page([]));
    expect(await screen.findByText('Historia jest pusta')).toBeInTheDocument();
  });

  it('no results when filters are used', async () => {
    show(page([]), '/admin/activity-log?search=Kaufland');
    expect(await screen.findByText(/Żaden wpis nie pasuje do filtrów/)).toBeInTheDocument();
  });

  it('to date before from date shows a field error and is not sent', async () => {
    const { router } = show(page([item({})]), '/admin/activity-log?from=2026-11-20');
    await screen.findByText('Zatwierdzenie wniosku');
    fireEvent.change(screen.getByRole('textbox', { name: 'Do dnia' }), { target: { value: '19.11.2026' } });
    expect(await screen.findByText('Data „do” nie może być wcześniejsza niż „od”.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?from=2026-11-20');
  });

  it('clicking an entry expands before → after and the open button; one open at a time', async () => {
    show(page([
      item({ id: 2 }),
      item({ id: 1, area: 'tasks', action: 'update', entityName: 'Oferta', changes: { assignee_ids: { before: ['Jan Kowalski'], after: ['Jan Kowalski', null] }, finished: { before: false, after: true } }, link: '/admin/tasks/4?task=7' }),
    ]));
    const first = await screen.findByRole('button', { name: /Zatwierdzenie wniosku/ });
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Czeka na decyzję')).toBeInTheDocument();
    expect(screen.getByText('Zatwierdzony')).toBeInTheDocument();
    const second = screen.getByRole('button', { name: /Zmiana zadania/ });
    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Jan Kowalski, usunięte konto')).toBeInTheDocument();
    expect(screen.getByText('tak')).toBeInTheDocument();
    fireEvent.click(first);
    // Collapse w jsdom nie kończy animacji: rozwinięta treść jest dla zapytań po roli wciąż „ukryta” (przejście: e2e).
    expect(screen.getByRole('link', { name: 'Otwórz wniosek', hidden: true })).toHaveAttribute('href', '/admin/leave-requests/21');
  });

  it('archived and deleted records show badges and no open button', async () => {
    show(page([
      item({ id: 2, area: 'tasks', action: 'archive', entityName: 'Spotkanie', state: 'archived', link: null, changes: {} }),
      item({ id: 1, area: 'projects', action: 'delete', entityName: 'Targi', state: 'deleted', link: null, changes: { name: { before: 'Targi', after: null } } }),
    ]));
    const archived = await screen.findByRole('button', { name: /Usunięcie zadania \(do archiwum\)/ });
    expect(within(archived).getByText('w archiwum')).toBeInTheDocument();
    fireEvent.click(archived);
    expect(screen.getByText('Bez szczegółów do pokazania.')).toBeInTheDocument();
    const deleted = screen.getByRole('button', { name: /Usunięcie projektu na stałe/ });
    expect(within(deleted).getByText('usunięty na stałe')).toBeInTheDocument();
    fireEvent.click(deleted);
    expect(screen.getByText('Nazwa zapamiętana w chwili zmiany, rekordu już nie ma.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Otwórz/, hidden: true })).not.toBeInTheDocument();
  });
});
