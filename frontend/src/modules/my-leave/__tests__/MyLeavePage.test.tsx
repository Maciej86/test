import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';
import type { MyLeaveOverview, MyLeaveRequest } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { MyLeavePage } from '../MyLeavePage';

const overview: MyLeaveOverview = {
  pool: { year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 5, pendingDays: 2, pendingCarried: 0, leftDays: 19, leftCarriedDays: 0 },
  types: [
    { id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, usedOfLimit: 0 },
    { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, usedOfLimit: 1 },
    { id: 3, name: 'Okolicznościowy', deductsPool: false, yearlyLimit: null, usedOfLimit: 0 },
  ],
  years: [2026, 2025],
  busy: [{ dateFrom: '2026-11-26', dateTo: '2026-11-27', leaveTypeName: 'Wypoczynkowy', status: 'pending' }],
};

const request = (o: Partial<MyLeaveRequest>): MyLeaveRequest => ({
  id: 21, leaveTypeName: 'Wypoczynkowy', deductsPool: true, dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2,
  daysFromCarried: 0, daysFromAnnual: 2, poolYear: 2026, comment: 'Wyjazd rodzinny.', status: 'pending', rejectReason: null,
  decidedByName: null, decidedAt: null, createdAt: '2026-11-16T08:12:00.000Z', ...o,
});

const requests = [
  request({}),
  request({ id: 18, leaveTypeName: 'Na żądanie', dateFrom: '2026-10-09', dateTo: '2026-10-09', workingDays: 1, daysFromAnnual: 1, comment: null, status: 'approved', decidedByName: 'Anna Nowak', decidedAt: '2026-10-09T06:05:00.000Z' }),
  request({ id: 15, dateFrom: '2026-08-03', dateTo: '2026-08-14', workingDays: 10, daysFromAnnual: 10, comment: null, status: 'rejected', decidedByName: 'Anna Nowak', decidedAt: '2026-06-23T08:15:00.000Z', rejectReason: 'Inwentaryzacja.' }),
  request({ id: 12, dateFrom: '2026-07-06', dateTo: '2026-07-13', workingDays: 6, daysFromCarried: 4, daysFromAnnual: 2, comment: null, status: 'approved', decidedByName: 'Anna Nowak', decidedAt: '2026-06-02T07:30:00.000Z' }),
  request({ id: 10, leaveTypeName: 'Okolicznościowy', deductsPool: false, dateFrom: '2026-05-14', dateTo: '2026-05-15', daysFromAnnual: 0, comment: null, status: 'approved' }),
];

const mockApi = (o: { overview?: MyLeaveOverview; items?: MyLeaveRequest[] } = {}) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
    if (url === '/my-leave/overview') return { data: o.overview ?? overview };
    if (url === '/my-leave/requests') return { data: { year: (config?.params as { year?: number } | undefined)?.year ?? 2026, items: o.items ?? requests } };
    if (url === '/notifications/summary') return { data: { unread: 0, latest: [] } };
    throw new Error(`unexpected GET ${url}`);
  });

const show = (path = '/admin/my-leave') => renderRoutes([{ path: '/admin/my-leave', element: <MyLeavePage /> }], path);
const table = async () => screen.findByRole('table');
const rowOf = async (text: string) => within(await table()).getByText(text).closest('tr')!;

afterEach(() => vi.restoreAllMocks());

describe('MyLeavePage', () => {
  it('shows pool numbers and legend', async () => {
    mockApi();
    show();
    expect(await screen.findByText('Urlop w 2026')).toBeInTheDocument();
    expect(screen.getByText('19', { selector: '[data-left]' })).toBeInTheDocument();
    expect(screen.getByText('dni do wykorzystania (z 30)')).toBeInTheDocument();
    expect(screen.getByLabelText('Zostało 19 z 30 dni')).toBeInTheDocument();
    const legend = screen.getByTestId('pool-legend');
    expect(legend).toHaveTextContent('9 wykorzystane');
    expect(legend).toHaveTextContent('2 czeka na decyzję');
    expect(legend).toHaveTextContent('0 zostało z zaległego z 2025');
    expect(legend).toHaveTextContent('19 zostało z puli rocznej');
    expect(screen.getByText('Pula na rok: 26 dni, zaległy urlop z 2025: 4 dni. Zaległy urlop schodzi pierwszy.')).toBeInTheDocument();
  });

  it('no days left → the big number is red', async () => {
    mockApi({ overview: { ...overview, pool: { ...overview.pool, leftDays: 0 } } });
    show();
    expect(await screen.findByText('0', { selector: '[data-left]' })).toHaveAttribute('data-left', 'none');
  });

  it('limits box shows types with a limit; disappears without them', async () => {
    mockApi();
    const { unmount } = show();
    const limits = (await screen.findByText('Limity w 2026')).closest('.mantine-Card-root') as HTMLElement;
    expect(within(limits).getByText('Na żądanie')).toBeInTheDocument();
    expect(within(limits).getByText('z 4 dni')).toBeInTheDocument();
    expect(within(limits).queryByText('Wypoczynkowy')).not.toBeInTheDocument();
    unmount();
    vi.restoreAllMocks();
    mockApi({ overview: { ...overview, types: overview.types.map((t) => ({ ...t, yearlyLimit: null })) } });
    show();
    await screen.findByText('Urlop w 2026');
    expect(screen.queryByText('Limity w 2026')).not.toBeInTheDocument();
  });

  it('requests: rows in server order with statuses, split and decision; Wycofaj only for pending', async () => {
    mockApi();
    show();
    const rows = within(await table()).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]!.textContent)).toEqual([
      '26.11.2026 – 27.11.2026Wyjazd rodzinny.', '09.10.2026', '03.08.2026 – 14.08.2026', '06.07.2026 – 13.07.2026', '14.05.2026 – 15.05.2026',
    ]);
    const pending = await rowOf('Wyjazd rodzinny.');
    expect(within(pending).getByText('Czeka na decyzję')).toBeInTheDocument();
    expect(within(pending).getByText('2 z puli 2026')).toBeInTheDocument();
    expect(within(pending).getByRole('button', { name: 'Wycofaj' })).toBeInTheDocument();
    const rejected = rows[2]!;
    expect(within(rejected).getByText('Odrzucony')).toBeInTheDocument();
    expect(within(rejected).getByText('nie liczą się do puli')).toBeInTheDocument();
    expect(within(rejected).getByText('„Inwentaryzacja.”')).toBeInTheDocument();
    expect(within(rejected).getByText(/Anna Nowak/)).toHaveTextContent('Anna Nowak, 23.06.2026');
    expect(within(rejected).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[3]!).getByText('4 z zaległego, 2 z puli 2026')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('nie odejmuje z puli')).toBeInTheDocument();
    expect(within(await table()).getAllByRole('button', { name: 'Wycofaj' })).toHaveLength(1);
  });

  it('empty year shows empty state with Złóż wniosek', async () => {
    mockApi({ items: [] });
    show();
    expect(await screen.findByText('W tym roku nie masz jeszcze wniosków. Złóż pierwszy, gdy zaplanujesz urlop.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Złóż wniosek' })).toHaveLength(2);
  });

  it('?year=2025 asks for that year; changing the year asks again', async () => {
    const get = mockApi();
    const { router } = show('/admin/my-leave?year=2025');
    await table();
    expect(get).toHaveBeenCalledWith('/my-leave/requests', { params: { year: 2025 } });
    fireEvent.click(screen.getByLabelText('Rok', { selector: 'input' }));
    fireEvent.click(await screen.findByRole('option', { name: '2026' }));
    await waitFor(() => expect(router.state.location.search).toBe('?year=2026'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/my-leave/requests', { params: { year: 2026 } }));
  });

  it('?year=abc falls back to the open year', async () => {
    const get = mockApi();
    show('/admin/my-leave?year=abc');
    await table();
    expect(get).toHaveBeenCalledWith('/my-leave/requests', { params: {} });
    expect(screen.getByLabelText('Rok', { selector: 'input' })).toHaveValue('2026');
  });

  it('no pool yet → message from the server', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/my-leave/overview') {
        const { AxiosError, AxiosHeaders } = await import('axios');
        const config = { url, headers: new AxiosHeaders() };
        throw new AxiosError('fail', 'ERR', config, undefined, { status: 404, statusText: 'x', headers: {}, config, data: { error: { message: 'my-leave.server.no_pool' } } });
      }
      return { data: { year: 2026, items: [] } };
    });
    show();
    expect(await screen.findByText('Nie masz jeszcze puli dni urlopu. Poproś administratora o jej ustawienie.')).toBeInTheDocument();
  });

  it('Złóż wniosek opens the request window with the types', async () => {
    mockApi();
    show();
    await screen.findByText('Urlop w 2026');
    fireEvent.click(screen.getAllByRole('button', { name: 'Złóż wniosek' })[0]!);
    expect(await screen.findByRole('dialog', { name: 'Złóż wniosek' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wypoczynkowy')).toBeInTheDocument();
  });

  it('after submitting, the list shows the year of the new request', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    mockApi();
    vi.spyOn(api, 'post').mockResolvedValue({ data: request({ id: 40, dateFrom: '2026-12-21', dateTo: '2026-12-31' }) });
    const { router } = show('/admin/my-leave?year=2025');
    await table();
    fireEvent.click(screen.getAllByRole('button', { name: 'Złóż wniosek' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Złóż wniosek' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Od/ }), { target: { value: '21.12.2026' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Złóż wniosek' }));
    await waitFor(() => expect(router.state.location.search).toBe('?year=2026'));
    vi.useRealTimers();
  });

  it('withdraw: confirm text with days; Zostaw changes nothing; Wycofaj sends, toast', async () => {
    mockApi();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show();
    fireEvent.click(within(await rowOf('Wyjazd rodzinny.')).getByRole('button', { name: 'Wycofaj' }));
    const dialog = await screen.findByRole('dialog', { name: 'Wycofać wniosek?' });
    expect(within(dialog).getByText(/^Wypoczynkowy,/)).toHaveTextContent('Wypoczynkowy, 26.11.2026 – 27.11.2026 (2 dni robocze).');
    expect(within(dialog).getByText(/2 zarezerwowane dni wrócą do puli/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zostaw' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(within(await rowOf('Wyjazd rodzinny.')).getByRole('button', { name: 'Wycofaj' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Wycofaj' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/my-leave/requests/21/withdraw'));
    expect(success).toHaveBeenCalledWith('Wniosek wycofany. Dni wróciły do puli.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('withdraw of a type without pool: no sentence about the pool; error keeps the window', async () => {
    const config = { url: '/my-leave/requests/9/withdraw', headers: new AxiosHeaders() };
    mockApi({ items: [request({ id: 9, leaveTypeName: 'Okolicznościowy', deductsPool: false, daysFromAnnual: 0, comment: 'Ślub siostry.' })] });
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('fail', 'ERR', config, undefined, { status: 409, statusText: 'x', headers: {}, config, data: { error: { message: 'my-leave.server.not_pending' } } }),
    );
    const error = vi.spyOn(notify, 'error');
    show();
    fireEvent.click(within(await rowOf('Ślub siostry.')).getByRole('button', { name: 'Wycofaj' }));
    const dialog = await screen.findByRole('dialog', { name: 'Wycofać wniosek?' });
    expect(within(dialog).queryByText(/puli/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wycofaj' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Tego wniosku nie można już wycofać, bo nie czeka na decyzję. Odśwież stronę.'));
    expect(screen.getByRole('dialog', { name: 'Wycofać wniosek?' })).toBeInTheDocument();
  });
});
