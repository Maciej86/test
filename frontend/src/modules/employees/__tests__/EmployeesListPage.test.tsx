import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { EmployeeListItem, EmployeesListResponse } from '@app/shared';
import { todayIsoDate } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderRoutes } from '../../../test/render';
import { EmployeesListPage } from '../EmployeesListPage';

const thisYear = Number(todayIsoDate().slice(0, 4));
const anna: EmployeeListItem = {
  id: 1, name: 'Anna Nowak', firstName: 'Anna', lastName: 'Nowak', login: 'anna.nowak@firma.pl', email: 'anna.nowak@firma.pl', role: 'admin', hiredOn: null, contractType: null, isMe: true, pool: null,
};
const jan: EmployeeListItem = {
  id: 2, name: 'Jan Kowalski', firstName: 'Jan', lastName: 'Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', hiredOn: '2024-03-01', contractType: 'b2b', isMe: false,
  pool: { year: thisYear, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 0, leftDays: 21, leftCarriedDays: 0 },
};
const list = (items: EmployeeListItem[], o: Partial<EmployeesListResponse> = {}): EmployeesListResponse => ({
  items, total: items.length, page: 1, pageSize: 25, openYear: thisYear,
  counts: { all: items.length, admins: items.filter((i) => i.role === 'admin').length }, ...o,
});

const show = (response: EmployeesListResponse, path = '/admin/employees') => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: response });
  const view = renderRoutes([{ path: '/admin/employees', element: <EmployeesListPage /> }], path);
  return { get, ...view };
};

afterEach(() => vi.restoreAllMocks());

describe('EmployeesListPage', () => {
  it('shows rows with name, login, role and pool', async () => {
    show(list([anna, jan]));
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Jan Kowalski')).toBeInTheDocument();
    expect(within(table).getByText('jan.kowalski@firma.pl')).toBeInTheDocument();
    const janRow = within(table).getByText('Jan Kowalski').closest('tr')!;
    expect(within(janRow).getByText('Pracownik')).toBeInTheDocument();
    expect(within(janRow).getByText('21')).toBeInTheDocument();
    expect(within(janRow).getAllByText('brak').length).toBeGreaterThanOrEqual(1);
    expect(within(janRow).getByText('01.03.2024')).toBeInTheDocument();
    expect(within(janRow).getByText('B2B')).toBeInTheDocument();
    expect(within(table).getByText('Zatrudniony od')).toBeInTheDocument();
    expect(within(table).getByText('Umowa')).toBeInTheDocument();
    expect(within(table).getByText(`Urlop w ${thisYear}`)).toBeInTheDocument();
    expect(screen.getByText('Osób z kontem: 2, w tym administratorów: 1')).toBeInTheDocument();
  });

  it('own account: "(to Ty)" and disabled archive button', async () => {
    show(list([anna, jan]));
    const table = await screen.findByRole('table');
    const annaRow = within(table).getByText('Anna Nowak').closest('tr')!;
    expect(within(annaRow).getByText('(to Ty)')).toBeInTheDocument();
    expect(within(annaRow).getByRole('button', { name: 'Do archiwum' })).toBeDisabled();
    const janRow = within(table).getByText('Jan Kowalski').closest('tr')!;
    expect(within(janRow).getByRole('button', { name: 'Do archiwum' })).toBeEnabled();
  });

  it('typing in search changes the address and the request', async () => {
    const { get, router } = show(list([anna, jan]));
    await screen.findByRole('table');
    fireEvent.change(screen.getByPlaceholderText('Szukaj po imieniu, nazwisku albo loginie'), { target: { value: 'kowal' } });
    await waitFor(() => expect(router.state.location.search).toContain('search=kowal'));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/employees', { params: expect.objectContaining({ search: 'kowal', page: 1 }) }));
  });

  it('reads search, role and sort from the address', async () => {
    const { get } = show(list([jan]), '/admin/employees?search=jan&role=employee&sort=days_left&page=2');
    await screen.findByRole('table');
    expect(get).toHaveBeenCalledWith('/employees', {
      params: expect.objectContaining({ search: 'jan', role: 'employee', sort: 'days_left', page: 2 }),
    });
  });

  it('only administrators → "Nie masz jeszcze pracowników"', async () => {
    show(list([anna]));
    expect(await screen.findByText('Nie masz jeszcze pracowników')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dodaj pracownika' }).length).toBeGreaterThan(1);
  });

  it('no results → text with the phrase and "Wyczyść wyszukiwanie"', async () => {
    const { router } = show(list([], { counts: { all: 2, admins: 1 } }), '/admin/employees?search=Grabowski');
    expect(await screen.findByText('Nikt nie pasuje do „Grabowski”. Sprawdź pisownię albo wyczyść wyszukiwanie.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Szukaj po imieniu, nazwisku albo loginie')).toHaveValue('Grabowski');
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść wyszukiwanie' }));
    await waitFor(() => expect(router.state.location.search).not.toContain('Grabowski'));
    expect(screen.getByPlaceholderText('Szukaj po imieniu, nazwisku albo loginie')).toHaveValue('');
  });

  it('clearing right after typing does not bring the old search back', async () => {
    const { router } = show(list([], { counts: { all: 2, admins: 1 } }), '/admin/employees?search=Grabowski');
    await screen.findByText(/Nikt nie pasuje/);
    fireEvent.change(screen.getByPlaceholderText('Szukaj po imieniu, nazwisku albo loginie'), { target: { value: 'Grabowskix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść wyszukiwanie' }));
    await new Promise((r) => setTimeout(r, 400));
    expect(router.state.location.search).toBe('');
    expect(screen.getByPlaceholderText('Szukaj po imieniu, nazwisku albo loginie')).toHaveValue('');
  });

  it('a broken sort in the address falls back to the default list instead of a blank page', async () => {
    const { get } = show(list([anna, jan]), '/admin/employees?sort=foo&search=jan');
    await screen.findByRole('table');
    expect(get).toHaveBeenCalledWith('/employees', { params: expect.objectContaining({ sort: 'name', search: 'jan' }) });
  });

  it('close year button disabled when the open year is later than this year', async () => {
    show(list([anna, jan], { openYear: thisYear + 1 }));
    expect(await screen.findByRole('button', { name: `Zamknij rok ${thisYear + 1}` })).toBeDisabled();
  });

  it('close year button enabled for the current year', async () => {
    show(list([anna, jan]));
    expect(await screen.findByRole('button', { name: `Zamknij rok ${thisYear}` })).toBeEnabled();
  });
});
