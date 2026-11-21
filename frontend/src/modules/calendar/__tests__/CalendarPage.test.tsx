import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { CalendarAbsence, CalendarResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { details } from '../../../test/leaveRequestFixtures';
import { renderRoutes } from '../../../test/render';
import { CalendarPage } from '../CalendarPage';

const absence = (o: Partial<CalendarAbsence> & { id: number; userId: number }): CalendarAbsence => ({
  leaveTypeName: 'Wypoczynkowy', color: 'green', status: 'approved', dateFrom: '2026-11-23', dateTo: '2026-11-27', days: 5, ...o,
});

const data = (o: Partial<CalendarResponse> = {}): CalendarResponse => ({
  from: '2026-11-17',
  to: '2027-01-16',
  today: '2026-11-17',
  people: [{ id: 8, name: 'Paweł Dąbrowski' }, { id: 2, name: 'Jan Kowalski' }, { id: 5, name: 'Magdalena Lewandowska' }],
  absences: [
    absence({ id: 22, userId: 5 }),
    absence({ id: 21, userId: 2, status: 'pending', dateFrom: '2026-11-26', dateTo: '2026-11-27', days: 2 }),
    absence({ id: 27, userId: 8, leaveTypeName: 'Opieka nad dzieckiem', color: 'navy', dateFrom: '2026-11-17', dateTo: '2026-11-18', days: 2 }),
  ],
  todayOff: [absence({ id: 27, userId: 8, leaveTypeName: 'Opieka nad dzieckiem', color: 'navy', dateFrom: '2026-11-17', dateTo: '2026-11-18', days: 2 })],
  ...o,
});

const show = (response: CalendarResponse | Error = data(), path = '/admin/calendar') => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (String(url).startsWith('/leave-requests/')) return { data: details() };
    if (response instanceof Error) throw response;
    return { data: response };
  });
  const r = renderRoutes([{ path: '/admin/calendar', element: <CalendarPage /> }], path);
  return { get, router: r.router };
};
const calendarCalls = (get: { mock: { calls: unknown[][] } }) => get.mock.calls.filter(([url]) => url === '/calendar');

afterEach(() => vi.restoreAllMocks());

describe('CalendarPage', () => {
  it('shows title with summary, "Dziś nie ma" and one row per person', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'Kalendarz' })).toBeInTheDocument();
    expect(await screen.findByText('Widoczne dni: 3 nieobecności, 1 czeka na decyzję')).toBeInTheDocument();
    expect(screen.getByText('Dziś nie ma: Paweł Dąbrowski (opieka nad dzieckiem)')).toBeInTheDocument();
    expect(screen.getAllByTestId('calendar-row').map((r) => r.dataset.name)).toEqual(['Paweł Dąbrowski', 'Jan Kowalski', 'Magdalena Lewandowska']);
  });

  it('"Dziś nie ma" comes from todayOff, also when the visible range starts later; nobody → "Dziś wszyscy są w pracy"', async () => {
    show(data({ from: '2026-12-17', to: '2027-02-15', absences: [] }), '/admin/calendar?from=2026-12-17');
    expect(await screen.findByText('Dziś nie ma: Paweł Dąbrowski (opieka nad dzieckiem)')).toBeInTheDocument();
    vi.restoreAllMocks();
    show(data({ todayOff: [] }));
    expect(await screen.findByText('Dziś wszyscy są w pracy')).toBeInTheDocument();
  });

  it('pending count uses the right verb form', async () => {
    show(data({ absences: [absence({ id: 1, userId: 2, status: 'pending' }), absence({ id: 2, userId: 5, status: 'pending' })] }));
    expect(await screen.findByText('Widoczne dni: 2 nieobecności, 2 czekają na decyzję')).toBeInTheDocument();
  });

  it('arrow at the last allowed start is disabled (no jump back to today)', async () => {
    show(data({ from: '2099-12-31', to: '2100-03-01' }), '/admin/calendar?from=2099-12-31');
    await screen.findAllByTestId('calendar-row');
    expect(screen.getByRole('button', { name: '30 dni później' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '30 dni wcześniej' })).toBeEnabled();
  });

  it('loading → spinner', async () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => undefined));
    renderRoutes([{ path: '/admin/calendar', element: <CalendarPage /> }], '/admin/calendar');
    expect(await screen.findByLabelText('Wczytywanie…')).toBeInTheDocument();
  });

  it('server error → error box with retry', async () => {
    const config = { url: '/calendar', headers: new AxiosHeaders() };
    show(new AxiosError('fail', 'ERR', config, undefined, { status: 500, statusText: '500', headers: {}, config, data: {} }));
    expect(await screen.findByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
  });

  it('no employees → empty state with button to Employees', async () => {
    show(data({ people: [], absences: [] }));
    expect(await screen.findByText('Nie ma jeszcze pracowników')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Przejdź do Pracowników' })).toHaveAttribute('href', '/admin/employees');
  });

  it('search filters rows; no result → "Nikt o takim imieniu…"', async () => {
    show();
    await screen.findAllByTestId('calendar-row');
    fireEvent.change(screen.getByLabelText('Szukaj osoby'), { target: { value: 'kowal' } });
    await waitFor(() => expect(screen.getAllByTestId('calendar-row').map((r) => r.dataset.name)).toEqual(['Jan Kowalski']));
    fireEvent.change(screen.getByLabelText('Szukaj osoby'), { target: { value: 'xyz' } });
    expect(await screen.findByText('Nikt o takim imieniu lub nazwisku nie pracuje w firmie.')).toBeInTheDocument();
  });

  it('color filter hides bars of these types and shows them again', async () => {
    show();
    expect(await screen.findByRole('button', { name: 'Magdalena Lewandowska: Wypoczynkowy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wypoczynkowy' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Magdalena Lewandowska: Wypoczynkowy' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Paweł Dąbrowski: Opieka nad dzieckiem' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wypoczynkowy' }));
    expect(await screen.findByRole('button', { name: 'Magdalena Lewandowska: Wypoczynkowy' })).toBeInTheDocument();
  });

  it('arrows change ?from by 30 days; "Dziś" disabled when the range starts today and goes back', async () => {
    const { get, router } = show();
    await screen.findAllByTestId('calendar-row');
    expect(screen.getByRole('button', { name: 'Dziś' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '30 dni później' }));
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-12-17'));
    await waitFor(() => expect(calendarCalls(get).at(-1)).toEqual(['/calendar', { params: { from: '2026-12-17' } }]));
    fireEvent.click(screen.getByRole('button', { name: '30 dni wcześniej' }));
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-11-17'));
  });

  it('?from in the address is sent to the server; a bad date is ignored (today)', async () => {
    const { get } = show(data({ from: '2026-12-01', to: '2027-01-30' }), '/admin/calendar?from=2026-12-01');
    await screen.findAllByTestId('calendar-row');
    expect(calendarCalls(get)[0]).toEqual(['/calendar', { params: { from: '2026-12-01' } }]);
    expect(screen.getByRole('button', { name: 'Dziś' })).toBeEnabled();
    vi.restoreAllMocks();
    const second = show(data(), '/admin/calendar?from=2026-02-30');
    await waitFor(() => expect(calendarCalls(second.get)[0]).toEqual(['/calendar', { params: {} }]));
  });

  it('click on a bar opens leave request details with approve and reject', async () => {
    const { get } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Jan Kowalski: Wypoczynkowy (czeka)' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/leave-requests/21'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('button', { name: 'Zatwierdź' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Odrzuć' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('link', { name: 'Pokaż w kalendarzu' })).not.toBeInTheDocument();
  });

  it('abuse: HTML in a name or a leave type is shown as plain text', async () => {
    const evil = '<img src=x onerror=alert(1)>';
    show(data({
      people: [{ id: 2, name: evil }],
      absences: [absence({ id: 21, userId: 2, leaveTypeName: '<b>Gruby</b>' })],
      todayOff: [],
    }));
    expect(await screen.findByText(evil)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${evil}: <b>Gruby</b>` })).toHaveTextContent('<b>Gruby</b>');
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });
});
