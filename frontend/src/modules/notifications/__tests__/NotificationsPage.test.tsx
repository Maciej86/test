import { fireEvent, screen, waitFor } from '@testing-library/react';
import { formatDate, type NotificationItem, type NotificationsListResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { NotificationsPage } from '../NotificationsPage';

const DAY_MS = 24 * 60 * 60 * 1000;
const item = (o: Partial<NotificationItem>): NotificationItem => ({
  id: 1,
  type: 'leave_approved',
  params: { leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12' },
  actorName: 'Anna Nowak',
  link: '/admin/my-leave',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...o,
});
const page = (o: Partial<NotificationsListResponse>): NotificationsListResponse => ({ items: [], total: 0, page: 1, pageSize: 25, unread: 0, ...o });

const show = (data: NotificationsListResponse, path = '/admin/notifications') => {
  vi.spyOn(api, 'get').mockResolvedValue({ data });
  vi.spyOn(api, 'post').mockResolvedValue({ data: { updated: 1 } });
  return renderRoutes(
    [
      { path: '/admin/notifications', element: <NotificationsPage /> },
      { path: '/admin/my-leave', element: <p>Moje urlopy</p> },
    ],
    path,
  );
};

afterEach(() => vi.restoreAllMocks());

describe('NotificationsPage', () => {
  it('groups by day: Dzisiaj, Wczoraj, date', async () => {
    const old = new Date(Date.now() - 5 * DAY_MS);
    show(page({
      total: 3,
      unread: 1,
      items: [
        item({ id: 3 }),
        item({ id: 2, type: 'leave_cancelled', readAt: new Date().toISOString(), createdAt: new Date(Date.now() - DAY_MS).toISOString() }),
        item({ id: 1, type: 'task_assigned', params: { task: 'Tonery' }, readAt: old.toISOString(), createdAt: old.toISOString() }),
      ],
    }));
    expect(await screen.findByText('Dzisiaj')).toBeInTheDocument();
    expect(screen.getByText('Wczoraj')).toBeInTheDocument();
    expect(screen.getByText(formatDate(old)!)).toBeInTheDocument();
    expect(screen.getByText('Urlop zatwierdzony')).toBeInTheDocument();
    expect(screen.getByText('„Tonery”')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, unread: '0' } });
  });

  it('?unread=1 sends unread 1; the switch changes the address', async () => {
    const { router } = show(page({ unread: 2 }), '/admin/notifications?unread=1');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, unread: '1' } }));
    fireEvent.click(await screen.findByText('Wszystkie'));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    fireEvent.click(screen.getByText('Nieprzeczytane (2)'));
    await waitFor(() => expect(router.state.location.search).toBe('?unread=1'));
  });

  it('empty with unread filter → empty_unread', async () => {
    show(page({}), '/admin/notifications?unread=1');
    expect(await screen.findByText('Wszystko przeczytane.')).toBeInTheDocument();
  });

  it('empty without filter → empty text, no mark all button', async () => {
    show(page({}));
    expect(await screen.findByText('Nie masz jeszcze powiadomień. Pojawią się tu, gdy coś będzie dotyczyć Ciebie.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oznacz wszystkie jako przeczytane' })).not.toBeInTheDocument();
  });

  it('mark all read failing → error message', async () => {
    show(page({ total: 1, unread: 1, items: [item({})] }));
    vi.mocked(api.post).mockRejectedValue(new Error('network'));
    const error = vi.spyOn(notify, 'error').mockImplementation(() => {});
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz wszystkie jako przeczytane' }));
    await waitFor(() => expect(error).toHaveBeenCalled());
  });

  it('second page via Pagination', async () => {
    const { router } = show(page({ total: 30, unread: 1, items: [item({})] }));
    const pager = await screen.findByRole('button', { name: '2' });
    fireEvent.click(pager);
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
  });

  it('clicking marks read and opens the link; mark all read', async () => {
    const { router } = show(page({ total: 1, unread: 1, items: [item({ id: 9 })] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz wszystkie jako przeczytane' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
    fireEvent.click(screen.getByText('Urlop zatwierdzony'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/my-leave'));
    expect(api.post).toHaveBeenCalledWith('/notifications/9/read');
  });
});
