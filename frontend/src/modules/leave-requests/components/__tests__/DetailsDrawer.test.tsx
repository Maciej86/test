import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { LeaveRequestDetails } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { apiError, details, list } from '../../../../test/leaveRequestFixtures';
import { renderRoutes } from '../../../../test/render';
import { LeaveRequestsPage } from '../../LeaveRequestsPage';

const show = (path: string, detailsOf: (id: string) => LeaveRequestDetails | Error) => {
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/leave-requests') return { data: list([]) };
    const id = /^\/leave-requests\/(\w+)$/.exec(url)?.[1];
    if (id) {
      const result = detailsOf(id);
      if (result instanceof Error) throw result;
      return { data: result };
    }
    return { data: { unread: 0, latest: [] } };
  });
  const element = <LeaveRequestsPage />;
  return renderRoutes([{ path: '/admin/leave-requests', element }, { path: '/admin/leave-requests/:id', element }], path);
};
/** Okno szczegółów z wczytaną treścią (pod nazwiskiem jest zawsze typ urlopu i liczba dni). */
const drawer = async () => {
  const d = await screen.findByRole('dialog', { name: /Wniosek nr/ });
  await within(d).findByText(/^Wypoczynkowy, /);
  return d;
};

afterEach(() => vi.restoreAllMocks());

describe('DetailsDrawer', () => {
  it('opens for :id in the address; closing returns to the list with the same filters', async () => {
    const { router } = show('/admin/leave-requests/24?status=approved', () => details({ id: 24, employeeName: 'Piotr Zieliński' }));
    const d = await drawer();
    expect(within(d).getByText('Wniosek nr 24')).toBeInTheDocument();
    expect(within(d).getAllByText('Piotr Zieliński').length).toBeGreaterThan(0);
    fireEvent.click(within(d).getByRole('button', { name: 'Zamknij' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/leave-requests'));
    expect(router.state.location.search).toBe('?status=approved');
  });

  it('pending: strip, pool box with "Po zatwierdzeniu zostanie 15 dni…", comment, Odrzuć and Zatwierdź', async () => {
    show('/admin/leave-requests/24', () =>
      details({
        id: 24, employeeName: 'Piotr Zieliński', dateFrom: '2026-12-21', dateTo: '2026-12-24', workingDays: 3, daysFromAnnual: 3,
        comment: 'Wyjazd do rodziców.', pool: { year: 2026, annualDays: 26, carriedDays: 0, used: 8, pending: 3, left: 15 },
        others: [{ employeeName: 'Tomasz Wójcik', dateFrom: '2026-12-21', dateTo: '2026-12-22', status: 'approved' }],
      }),
    );
    const d = await drawer();
    expect(within(d).getByText('Kto jeszcze ma wtedy wolne')).toBeInTheDocument();
    expect(within(d).getAllByTestId('strip-row')).toHaveLength(2);
    expect(within(d).getByText('Pula na 2026')).toBeInTheDocument();
    expect(within(d).getByText('Po zatwierdzeniu zostanie 15 dni. Zatwierdzenie nie zmienia tej liczby, bo dni są już zarezerwowane.')).toBeInTheDocument();
    expect(within(d).getByText('Wyjazd do rodziców.')).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Odrzuć' })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Zatwierdź' })).toBeInTheDocument();
  });

  it('approved: Anuluj urlop only when canCancel, PDF link; decided by and reason for a rejected one', async () => {
    show('/admin/leave-requests/22', (id) =>
      id === '22'
        ? details({ id: 22, status: 'approved', canCancel: true, decidedByName: 'Anna Nowak', decidedAt: '2026-11-03T07:40:00.000Z' })
        : details({ id: 15, status: 'rejected', decidedByName: 'Anna Nowak', decidedAt: '2026-06-23T08:15:00.000Z', decisionReason: 'Inwentaryzacja.', pool: null }),
    );
    const d = await drawer();
    expect(within(d).getByRole('button', { name: 'Anuluj urlop' })).toBeInTheDocument();
    expect(within(d).getByRole('link', { name: 'PDF' })).toHaveAttribute('href', expect.stringMatching(/\/leave-requests\/22\/pdf$/));
    expect(within(d).getByText('Zatwierdził(a)')).toBeInTheDocument();
    expect(within(d).getByText(/^Wykorzystane: 9 \(razem z tym wnioskiem\), czeka na decyzję: 2/)).toBeInTheDocument();
  });

  it('decided request: no strip, no pool, no decision buttons, reason shown', async () => {
    show('/admin/leave-requests/15', () =>
      details({ id: 15, status: 'rejected', decidedByName: 'Anna Nowak', decidedAt: '2026-06-23T08:15:00.000Z', decisionReason: 'Inwentaryzacja.', pool: null }),
    );
    const d = await drawer();
    expect(within(d).queryByText('Kto jeszcze ma wtedy wolne')).toBeNull();
    expect(within(d).queryByRole('button', { name: 'Zatwierdź' })).toBeNull();
    expect(within(d).getByText('Odrzucił(a)')).toBeInTheDocument();
    expect(within(d).getByText('„Inwentaryzacja.”')).toBeInTheDocument();
  });

  it('pending with a past date: yellow frame', async () => {
    show('/admin/leave-requests/19', () => details({ id: 19, dateFrom: '2020-01-10', dateTo: '2020-01-10' }));
    expect(within(await drawer()).getByText(/Termin tego wniosku już się zaczął albo minął/)).toBeInTheDocument();
  });

  it.each(['abc', '0', '999999'])('wrong number in the address (%s) → list and "Nie ma takiego wniosku."', async (id) => {
    const error = vi.spyOn(notify, 'error');
    const { router } = show(`/admin/leave-requests/${id}`, () => apiError(404, { message: 'server.not_found' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Nie ma takiego wniosku.'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/leave-requests'));
  });
});
