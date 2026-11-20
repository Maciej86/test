import { screen, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { AdminDashboard, DashboardTask, EmployeeDashboard } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderRoutes } from '../../../test/render';
import { DashboardPage } from '../DashboardPage';

const task = (o: Partial<DashboardTask> & { id: number }): DashboardTask => ({
  title: `Zadanie ${o.id}`, projectId: 2, projectName: 'Produkcja', column: 'in_progress', dueDate: null, ...o,
});

const admin: AdminDashboard = {
  role: 'admin',
  today: '2026-11-20',
  pending: {
    items: [
      { id: 21, employeeName: 'Jan Kowalski', leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2, createdAt: '2026-11-16T08:12:00.000Z' },
      { id: 22, employeeName: 'Piotr Zieliński', leaveTypeName: 'Okolicznościowy', dateFrom: '2026-11-20', dateTo: '2026-11-20', workingDays: 1, createdAt: '2026-11-17T08:12:00.000Z' },
      { id: 23, employeeName: 'Ewa Mazur', leaveTypeName: 'Na żądanie', dateFrom: '2026-11-18', dateTo: '2026-11-21', workingDays: 2, createdAt: '2026-11-17T08:12:00.000Z' },
      { id: 24, employeeName: 'Katarzyna Wiśniewska', leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-12-21', dateTo: '2026-12-31', workingDays: 7, createdAt: '2026-11-19T08:12:00.000Z' },
    ],
    total: 7,
  },
  absences: [
    { name: 'Katarzyna Wiśniewska', dateFrom: '2026-11-20', dateTo: '2026-11-20', status: 'approved' },
    { name: 'Piotr Zieliński', dateFrom: '2026-11-20', dateTo: '2026-11-20', status: 'pending' },
    { name: 'Magdalena Lewandowska', dateFrom: '2026-11-23', dateTo: '2026-11-27', status: 'approved' },
  ],
  projects: [
    { id: 1, name: 'Marketing', draft: 3, inProgress: 2, overdue: 1, doneRecently: 5 },
    { id: 3, name: 'Montaż', draft: 1, inProgress: 2, overdue: 0, doneRecently: 3 },
  ],
  overdue: { items: [task({ id: 7, title: 'Odebrać próbki lakieru', dueDate: '2026-11-13', assignees: [{ name: 'Tomasz Wójcik', archived: false }] })], total: 1 },
  myTasks: {
    items: [
      task({ id: 3, title: 'Oferta dla hurtowni', dueDate: '2026-11-18' }),
      task({ id: 5, title: 'Zdjęcia do katalogu', dueDate: '2026-11-20', projectName: 'Marketing', projectId: 1 }),
      task({ id: 9, title: 'Partia blatów', dueDate: '2026-11-21', column: 'draft' }),
      task({ id: 12, title: 'Inwentaryzacja', dueDate: '2026-11-30' }),
      task({ id: 14, title: 'Tonery', dueDate: null }),
    ],
    total: 7,
  },
};

const employee: EmployeeDashboard = {
  role: 'employee',
  today: '2026-11-20',
  pool: { year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 8, pendingDays: 2, pendingCarried: 0, leftDays: 16, leftCarriedDays: 0 },
  myPending: [{ id: 21, leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2 }],
  nextLeave: { id: 19, leaveTypeName: 'Wypoczynkowy', dateFrom: '2026-12-21', dateTo: '2026-12-23', workingDays: 3 },
  myTasks: { items: [task({ id: 3, title: 'Oferta dla hurtowni', dueDate: '2026-11-18' })], total: 1 },
};

const show = (data: AdminDashboard | EmployeeDashboard) => {
  vi.spyOn(api, 'get').mockResolvedValue({ data });
  renderRoutes([{ path: '/admin', element: <DashboardPage /> }], '/admin');
};
const card = (title: string | RegExp) => screen.getByRole('heading', { name: title }).closest('.mantine-Card-root') as HTMLElement;
const link = (text: string | RegExp) => screen.getByText(text).closest('a') as HTMLAnchorElement;

afterEach(() => vi.restoreAllMocks());

describe('DashboardPage', () => {
  it('header: "Pulpit" and "Dziś <weekday>, DD.MM.RRRR"', async () => {
    show(admin);
    expect(await screen.findByText('Dziś piątek, 20.11.2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pulpit', level: 1 })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/dashboard');
  });

  it('loading and server error through DataState', async () => {
    const error = new AxiosError('x', '500', undefined, undefined, {
      status: 500, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { error: { message: 'server.internal' } },
    });
    vi.spyOn(api, 'get').mockRejectedValue(error);
    renderRoutes([{ path: '/admin', element: <DashboardPage /> }], '/admin');
    expect(await screen.findByRole('button', { name: /Spróbuj ponownie/ })).toBeInTheDocument();
  });

  it('admin: pending requests with count badge, "zaczyna się …" texts, link to details', async () => {
    show(admin);
    await screen.findByText('Dziś piątek, 20.11.2026');
    const box = card(/Wnioski do rozpatrzenia/);
    expect(within(box).getByTestId('pending-count')).toHaveTextContent('7');
    expect(within(box).getByText('zaczyna się za 6 dni')).toHaveAttribute('data-soon', 'true');
    expect(within(box).getByText('zaczyna się dziś')).toHaveAttribute('data-soon', 'true');
    expect(within(box).getByText('termin już się zaczął')).toHaveAttribute('data-soon', 'true');
    expect(within(box).getByText('zaczyna się za 31 dni')).toHaveAttribute('data-soon', 'false');
    expect(within(box).getByText(/złożony 16\.11\.2026/)).toBeInTheDocument();
    expect(within(box).getAllByText('2 dni')).toHaveLength(2);
    expect(within(box).getByText('7 dni')).toBeInTheDocument();
    expect(link('Jan Kowalski')).toHaveAttribute('href', '/admin/leave-requests/21');
    expect(within(box).getByRole('link', { name: 'Wszystkie wnioski' })).toHaveAttribute('href', '/admin/leave-requests');
  });

  it('admin: no pending → "Wszystkie wnioski są rozpatrzone…"', async () => {
    show({ ...admin, pending: { items: [], total: 0 } });
    expect(await screen.findByText('Wszystkie wnioski są rozpatrzone. Nowy wniosek pojawi się tutaj i w dzwonku.')).toBeInTheDocument();
    expect(screen.queryByTestId('pending-count')).toBeNull();
  });

  it('admin: absence strip with "Dziś nie ma: …" from approved only; nobody → empty text', async () => {
    show(admin);
    await screen.findByText('Dziś piątek, 20.11.2026');
    const box = card('Nieobecności w najbliższych 2 tygodniach');
    expect(within(box).getByText('Dziś nie ma: Katarzyna Wiśniewska')).toBeInTheDocument();
    const rows = within(box).getAllByTestId('strip-row');
    expect(rows.map((r) => r.getAttribute('data-name'))).toEqual(['Katarzyna Wiśniewska', 'Piotr Zieliński', 'Magdalena Lewandowska']);
    expect(within(rows[0]!).getAllByTestId('strip-day')).toHaveLength(14);
    expect(within(rows[1]!).getAllByTestId('strip-day')[0]).toHaveAttribute('data-mark', 'pending');
    expect(within(box).getAllByTestId('strip-header-day')[0]).toHaveAttribute('data-today', 'true');
  });

  it('admin: nobody absent → empty text; nobody absent today → "Dziś wszyscy są w pracy."', async () => {
    show({ ...admin, absences: [] });
    expect(await screen.findByText('W najbliższych 2 tygodniach nikt nie ma urlopu.')).toBeInTheDocument();
  });

  it('admin: today only pending → "Dziś wszyscy są w pracy."', async () => {
    show({ ...admin, absences: [admin.absences[1]!] });
    expect(await screen.findByText('Dziś wszyscy są w pracy.')).toBeInTheDocument();
  });

  it('admin: projects table with overdue in red, links to boards; overdue tasks with people', async () => {
    show(admin);
    await screen.findByText('Dziś piątek, 20.11.2026');
    const box = card('Stan tablic');
    expect(within(box).getByRole('link', { name: 'Marketing' })).toHaveAttribute('href', '/admin/tasks/1');
    const marketing = within(box).getByRole('link', { name: 'Marketing' }).closest('tr') as HTMLElement;
    expect(within(marketing).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Marketing', '3', '2', '1', '5']);
    expect(within(marketing).getAllByRole('cell')[3]).toHaveAttribute('data-overdue', 'true');
    const montaz = within(box).getByRole('link', { name: 'Montaż' }).closest('tr') as HTMLElement;
    expect(within(montaz).getAllByRole('cell')[3]).toHaveAttribute('data-overdue', 'false');
    expect(within(box).getByText('Odebrać próbki lakieru').closest('a')).toHaveAttribute('href', '/admin/tasks/2?task=7');
    expect(within(box).getByLabelText('Tomasz Wójcik')).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'Projekty' })).toHaveAttribute('href', '/admin/tasks/projects');
  });

  it('admin: no projects → "Nie ma jeszcze projektów…"', async () => {
    show({ ...admin, projects: [], overdue: { items: [], total: 0 } });
    expect(await screen.findByText('Nie ma jeszcze projektów. Dodaj pierwszy na liście projektów.')).toBeInTheDocument();
    expect(screen.queryByText('Zadania po terminie')).toBeNull();
  });

  it('admin: no overdue tasks → "Żadne zadanie nie jest po terminie."', async () => {
    show({ ...admin, overdue: { items: [], total: 0 } });
    expect(await screen.findByText('Żadne zadanie nie jest po terminie.')).toBeInTheDocument();
  });

  it('my tasks: due "dziś"/"jutro"/"bez terminu", "i jeszcze N zadań", link opens task on the board', async () => {
    show(admin);
    await screen.findByText('Dziś piątek, 20.11.2026');
    const box = card('Moje zadania');
    expect(within(box).getByText('18.11.2026')).toHaveAttribute('data-due', 'overdue');
    expect(within(box).getByText('dziś')).toHaveAttribute('data-due', 'soon');
    expect(within(box).getByText('jutro')).toHaveAttribute('data-due', 'soon');
    expect(within(box).getByText('30.11.2026')).toHaveAttribute('data-due', 'normal');
    expect(within(box).getByText('bez terminu')).toHaveAttribute('data-due', 'none');
    expect(within(box).getByText('i jeszcze 2 zadania')).toBeInTheDocument();
    expect(within(box).getByText('Zdjęcia do katalogu').closest('a')).toHaveAttribute('href', '/admin/tasks/1?task=5');
    expect(within(box).getByText('Marketing')).toBeInTheDocument();
    expect(within(box).getAllByText('W toku').length).toBeGreaterThan(0);
  });

  it('my tasks: none → empty text', async () => {
    show({ ...admin, myTasks: { items: [], total: 0 } });
    expect(await screen.findByText('Nie masz przypisanych zadań w toku ani w opracowaniu.')).toBeInTheDocument();
  });

  it.todo('employee: pool card with "Złóż wniosek" to /admin/my-leave; no pool → text without button');
  it.todo('employee: my requests (pending and next approved) with empty texts');
  it.todo('employee: no admin boxes');
  void employee;
});
