import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { NotificationItem, NotificationsSummary } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { NotificationBell } from '../NotificationBell';

const item = (o: Partial<NotificationItem>): NotificationItem => ({
  id: 5,
  type: 'leave_request_new',
  params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12', days: 5 },
  actorName: 'Jan Kowalski',
  link: '/admin/leave-requests',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...o,
});

const show = (summary: NotificationsSummary | Error) => {
  const get = vi.spyOn(api, 'get');
  if (summary instanceof Error) get.mockRejectedValue(summary);
  else get.mockResolvedValue({ data: summary });
  vi.spyOn(api, 'post').mockResolvedValue({ data: { updated: 1 } });
  return renderRoutes(
    [
      { path: '/admin', element: <NotificationBell /> },
      { path: '/admin/leave-requests', element: <p>Ekran wniosków</p> },
      { path: '/admin/notifications', element: <p>Strona powiadomień</p> },
    ],
    '/admin',
  );
};
const bell = () => screen.findByRole('button', { name: /^Powiadomienia/ });

afterEach(() => vi.restoreAllMocks());

describe('NotificationBell', () => {
  it('shows the unread count', async () => {
    show({ unread: 3, latest: [item({})] });
    expect(await screen.findByRole('button', { name: 'Powiadomienia, nieprzeczytane: 3' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/notifications/summary');
  });

  it('100 unread → 99+', async () => {
    show({ unread: 100, latest: [] });
    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('0 unread → no count', async () => {
    show({ unread: 0, latest: [] });
    expect(await screen.findByRole('button', { name: 'Powiadomienia' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opening shows titles and details with dates', async () => {
    show({ unread: 1, latest: [item({}), item({ id: 6, type: 'leave_request_withdrawn', readAt: new Date().toISOString() })] });
    fireEvent.click(await bell());
    expect(await screen.findByText('Nowy wniosek: Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('Wypoczynkowy, 08.02.2027 – 12.02.2027, dni robocze: 5')).toBeInTheDocument();
    expect(screen.getByText('Wniosek wycofany: Jan Kowalski')).toBeInTheDocument();
  });

  it('clicking marks read and navigates to the link', async () => {
    const { router } = show({ unread: 1, latest: [item({})] });
    fireEvent.click(await bell());
    fireEvent.click(await screen.findByText('Nowy wniosek: Jan Kowalski'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/leave-requests'));
    expect(api.post).toHaveBeenCalledWith('/notifications/5/read');
  });

  it('link outside /admin/ → marked read, no navigation', async () => {
    const { router } = show({ unread: 1, latest: [item({ link: 'https://evil.example/admin/' })] });
    fireEvent.click(await bell());
    fireEvent.click(await screen.findByText('Nowy wniosek: Jan Kowalski'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/5/read'));
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('mark all read calls read-all; show all goes to the page', async () => {
    const { router } = show({ unread: 2, latest: [item({})] });
    fireEvent.click(await bell());
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz wszystkie jako przeczytane' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż wszystkie' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/notifications'));
  });

  it('mark all read failing → error message', async () => {
    show({ unread: 2, latest: [item({})] });
    vi.mocked(api.post).mockRejectedValue(new Error('network'));
    const error = vi.spyOn(notify, 'error').mockImplementation(() => {});
    fireEvent.click(await bell());
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz wszystkie jako przeczytane' }));
    await waitFor(() => expect(error).toHaveBeenCalled());
  });

  it('abuse: HTML in a task title is shown as plain text', async () => {
    show({ unread: 1, latest: [item({ type: 'task_assigned', params: { task: '<img src=x onerror=alert(1)><script>alert(1)</script>' }, link: '/admin/tasks' })] });
    fireEvent.click(await bell());
    expect(await screen.findByText('„<img src=x onerror=alert(1)><script>alert(1)</script>”')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
  });

  it('empty → empty text', async () => {
    show({ unread: 0, latest: [] });
    fireEvent.click(await bell());
    expect(await screen.findByText('Nie masz jeszcze powiadomień. Pojawią się tu, gdy coś będzie dotyczyć Ciebie.')).toBeInTheDocument();
  });

  it('error → try again', async () => {
    show(new Error('network'));
    fireEvent.click(await bell());
    expect(await screen.findByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
  });
});
