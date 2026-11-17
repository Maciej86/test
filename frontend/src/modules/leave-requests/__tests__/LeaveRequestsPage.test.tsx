import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { LeaveRequestsListResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderRoutes } from '../../../test/render';
import { LeaveRequestsPage } from '../LeaveRequestsPage';
import { list, requestItem } from '../../../test/leaveRequestFixtures';

const show = (response: LeaveRequestsListResponse, path = '/admin/leave-requests') => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/leave-requests') return { data: response };
    if (url === '/notifications/summary') return { data: { unread: 0, latest: [] } };
    return { data: requestItem() };
  });
  const element = <LeaveRequestsPage />;
  const view = renderRoutes([{ path: '/admin/leave-requests', element }, { path: '/admin/leave-requests/:id', element }], path);
  return { get, ...view };
};

afterEach(() => vi.restoreAllMocks());

describe('LeaveRequestsPage', () => {
  it('starts on "Czekają (3)" with the summary of the oldest pending request', async () => {
    const { get } = show(list([requestItem(), requestItem({ id: 19, employeeName: 'Katarzyna Wiśniewska' })]));
    expect(await screen.findByText('3 wnioski czekają na decyzję. Najdłużej czeka wniosek złożony 13.11.2026.')).toBeInTheDocument();
    expect(screen.getAllByText('Czekają (3)').length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith('/leave-requests', { params: expect.objectContaining({ status: 'pending', page: 1 }) });
    const row = within(await screen.findByRole('table')).getByText('Jan Kowalski').closest('tr')!;
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('26.11.2026 – 27.11.2026');
    expect(within(row).getByText('2 z puli 2026')).toBeInTheDocument();
    expect(within(row).getByText('19')).toBeInTheDocument();
    expect(within(row).getByText('Czeka na decyzję')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Zatwierdź' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Odrzuć' })).toBeInTheDocument();
  });

  it('no pending requests: summary says so', async () => {
    show(list([], { pendingCount: 0, oldestPendingAt: null }));
    expect(await screen.findByText('Żaden wniosek nie czeka na decyzję.')).toBeInTheDocument();
  });

  it('another tab shows the year filter; filters live in the address', async () => {
    const { get, router } = show(list([requestItem({ status: 'approved', canCancel: true })]));
    await screen.findByRole('table');
    expect(screen.queryAllByLabelText('Rok')).toHaveLength(0);
    fireEvent.click(screen.getAllByText('Zatwierdzone')[0]!);
    await waitFor(() => expect(router.state.location.search).toBe('?status=approved'));
    expect((await screen.findAllByLabelText('Rok'))[0]).toHaveValue('2026');
    await waitFor(() => expect(get).toHaveBeenCalledWith('/leave-requests', { params: expect.objectContaining({ status: 'approved' }) }));
  });

  it('row click goes to /admin/leave-requests/:id keeping the filters', async () => {
    const { router } = show(list([requestItem({ status: 'approved' })]), '/admin/leave-requests?status=approved&year=2025');
    fireEvent.click(within(await screen.findByRole('table')).getByText('Jan Kowalski'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/leave-requests/21'));
    expect(router.state.location.search).toBe('?status=approved&year=2025');
  });

  it('shows "termin już minął", "w archiwum" and "Anuluj urlop" only when canCancel', async () => {
    show(list([
      requestItem({ id: 19, employeeName: 'Katarzyna Wiśniewska', dateFrom: '2020-01-10', dateTo: '2020-01-10' }),
      requestItem({ id: 5, employeeName: 'Ewa Mazur', employeeArchived: true, status: 'approved', canCancel: true }),
      requestItem({ id: 3, employeeName: 'Tomasz Wójcik', status: 'approved', canCancel: false, poolLeft: null }),
      requestItem({ id: 2, employeeName: 'Piotr Zieliński', status: 'rejected', decidedByName: 'Anna Nowak', decidedAt: '2026-10-02T07:30:00.000Z', decisionReason: 'Audyt.' }),
    ], { years: [2026] }), '/admin/leave-requests?status=all');
    const table = await screen.findByRole('table');
    const rowOf = (name: string) => within(table).getByText(name).closest('tr')!;
    expect(within(rowOf('Katarzyna Wiśniewska')).getByText('termin już minął')).toBeInTheDocument();
    expect(within(rowOf('Ewa Mazur')).getByText('(w archiwum)')).toBeInTheDocument();
    expect(within(rowOf('Ewa Mazur')).getByRole('button', { name: 'Anuluj urlop' })).toBeInTheDocument();
    expect(within(rowOf('Ewa Mazur')).getByRole('link', { name: 'PDF' })).toHaveAttribute('href', expect.stringMatching(/\/leave-requests\/5\/pdf$/));
    expect(within(rowOf('Tomasz Wójcik')).queryByRole('button', { name: 'Anuluj urlop' })).toBeNull();
    expect(within(rowOf('Tomasz Wójcik')).getByText('brak')).toBeInTheDocument();
    const rejected = rowOf('Piotr Zieliński');
    expect(within(rejected).getByText('„Audyt.”')).toBeInTheDocument();
    expect(within(rejected).getByText('nie liczą się do puli')).toBeInTheDocument();
    expect(within(rejected).getByRole('button', { name: 'Szczegóły' })).toBeInTheDocument();
  });

  it('row buttons open the decision windows', async () => {
    show(list([requestItem(), requestItem({ id: 22, employeeName: 'Magdalena Lewandowska', status: 'approved', canCancel: true })], { pendingCount: 1 }), '/admin/leave-requests?status=all');
    const table = await screen.findByRole('table');
    fireEvent.click(within(within(table).getByText('Jan Kowalski').closest('tr')!).getByRole('button', { name: 'Zatwierdź' }));
    expect(await screen.findByText('Zatwierdzić wniosek?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć' }));
    fireEvent.click(within(within(table).getByText('Jan Kowalski').closest('tr')!).getByRole('button', { name: 'Odrzuć' }));
    expect(await screen.findByText('Odrzucenie wniosku')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wróć' }));
    fireEvent.click(within(within(table).getByText('Magdalena Lewandowska').closest('tr')!).getByRole('button', { name: 'Anuluj urlop' }));
    expect(await screen.findByText('Anulowanie urlopu')).toBeInTheDocument();
  });

  it('an empty page after the last request on it was decided goes back to page 1, not to "Wszystko rozpatrzone"', async () => {
    const { router } = show(list([], { total: 25, pendingCount: 25 }), '/admin/leave-requests?page=2');
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.queryByText('Wszystko rozpatrzone')).toBeNull();
  });

  it('empty pending tab and no results show their messages', async () => {
    show(list([], { pendingCount: 0 }));
    expect(await screen.findByText('Wszystko rozpatrzone')).toBeInTheDocument();
    vi.restoreAllMocks();
    show(list([]), '/admin/leave-requests?status=approved&search=Zenon');
    expect(await screen.findByText('Brak wniosków dla wybranych filtrów. Zmień rok, typ albo wyszukiwanie.')).toBeInTheDocument();
  });
});
