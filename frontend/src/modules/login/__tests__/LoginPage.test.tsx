import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { SessionUser } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderRoutes } from '../../../test/render';
import { LoginPage } from '../LoginPage';

const auth = { user: null as SessionUser | null, refresh: vi.fn(async () => {}) };
vi.mock('../../../core/auth/AuthProvider', () => ({
  useAuth: () => ({ user: auth.user, loading: false, refresh: auth.refresh, logout: vi.fn() }),
}));

const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: false };

const serverError = (status: number, message?: string) => {
  const config = { url: '/auth/login', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status,
    statusText: 'Error',
    data: message ? { error: { message } } : {},
    headers: {},
    config,
  });
};

const show = (path = '/login') => {
  return renderRoutes(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/admin', element: <p>Pulpit</p> },
      { path: '/change-password', element: <p>Ustawianie hasła</p> },
    ],
    path,
  );
};

const fillAndSubmit = (login = 'jan.kowalski@firma.pl', password = 'Urlop-2026') => {
  fireEvent.change(screen.getByLabelText('Login'), { target: { value: login } });
  fireEvent.change(screen.getByLabelText('Hasło'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
};

describe('LoginPage', () => {
  beforeEach(() => {
    auth.user = null;
    auth.refresh.mockClear();
    vi.restoreAllMocks();
  });

  it('empty fields show the required message', async () => {
    const post = vi.spyOn(api, 'post');
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
    expect(await screen.findAllByText('To pole jest wymagane.')).toHaveLength(2);
    expect(post).not.toHaveBeenCalled();
  });

  it('401 shows the login_failed message', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(serverError(401, 'server.login_failed'));
    show();
    fillAndSubmit();
    expect(await screen.findByText(/Login lub hasło są nieprawidłowe/)).toBeInTheDocument();
  });

  it('429 shows the too_many_logins message', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(serverError(429, 'server.too_many_logins'));
    show();
    fillAndSubmit();
    expect(await screen.findByText('Za dużo prób logowania. Spróbuj ponownie za 15 minut.')).toBeInTheDocument();
  });

  it('reason=idle and reason=expired show their messages', async () => {
    const { unmount } = show('/login?reason=idle');
    expect(screen.getByText(/Wylogowaliśmy Cię po 30 minutach/)).toBeInTheDocument();
    unmount();
    show('/login?reason=expired');
    expect(screen.getByText('Sesja wygasła. Zaloguj się ponownie.')).toBeInTheDocument();
  });

  it('no connection shows an error notification', async () => {
    const error = vi.spyOn(notify, 'error').mockImplementation(() => {});
    vi.spyOn(api, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    show();
    fillAndSubmit();
    await waitFor(() => expect(error).toHaveBeenCalledWith('Brak połączenia z serwerem. Czy backend działa? (npm run dev)'));
  });

  it('after login with a temporary password goes to /change-password, otherwise to /admin', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { user: { ...jan, mustChangePassword: true } } });
    const first = show();
    fillAndSubmit(' JAN.Kowalski@firma.pl ', ' hasło ');
    expect(await screen.findByText('Ustawianie hasła')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/login', { login: 'jan.kowalski@firma.pl', password: ' hasło ' });
    expect(auth.refresh).toHaveBeenCalled();
    first.unmount();

    vi.spyOn(api, 'post').mockResolvedValue({ data: { user: jan } });
    show();
    fillAndSubmit();
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
  });

  it('a logged-in person on /login goes to /admin', async () => {
    auth.user = jan;
    show();
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
  });

  it('shows today as a calendar sheet', () => {
    show();
    expect(screen.getAllByText('Urlopy i zadania').length).toBeGreaterThan(0);
    expect(screen.getByText('Wnioski urlopowe i tablica zadań zespołu.')).toBeInTheDocument();
  });
});
