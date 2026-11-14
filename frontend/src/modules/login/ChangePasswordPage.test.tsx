import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { SessionUser } from '@app/shared';
import { api } from '../../core/api/client';
import { notify } from '../../core/notify';
import { renderRoutes } from '../../test/render';
import { ChangePasswordPage } from './ChangePasswordPage';

const jan: SessionUser = { id: 2, name: 'Jan Kowalski', role: 'employee', mustChangePassword: true };
const auth = { user: jan as SessionUser | null, refresh: vi.fn(async () => {}), logout: vi.fn(async () => {}) };
vi.mock('../../core/auth/AuthProvider', () => ({
  useAuth: () => ({ user: auth.user, loading: false, refresh: auth.refresh, logout: auth.logout }),
}));

function show() {
  return renderRoutes(
    [
      { path: '/change-password', element: <ChangePasswordPage /> },
      { path: '/admin', element: <p>Pulpit</p> },
    ],
    '/change-password',
  );
}

function fill(newPassword: string, repeatPassword: string) {
  fireEvent.change(screen.getByLabelText('Nowe hasło'), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText('Powtórz nowe hasło'), { target: { value: repeatPassword } });
  fireEvent.click(screen.getByRole('button', { name: 'Zapisz i przejdź dalej' }));
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    auth.user = jan;
    auth.refresh.mockClear();
    auth.logout.mockClear();
    vi.restoreAllMocks();
  });

  it('different passwords show an error under repeat', async () => {
    const post = vi.spyOn(api, 'post');
    show();
    fill('Urlop-2026', 'Urlop-2025');
    expect(await screen.findByText('Hasła się różnią. Wpisz to samo hasło dwa razy.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('a weak password shows password_rules', async () => {
    show();
    fill('haslo', 'haslo');
    expect(await screen.findByText('Hasło musi mieć co najmniej 8 znaków, w tym cyfrę i znak specjalny.')).toBeInTheDocument();
  });

  it('server error password_same_as_temporary shows under new password', async () => {
    const config = { url: '/auth/change-password', headers: new AxiosHeaders() };
    const data = { error: { message: 'server.invalid_data', fields: { newPassword: 'validation.password_same_as_temporary' } } };
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('fail', 'ERR', config, undefined, { status: 400, statusText: 'Bad', data, headers: {}, config }),
    );
    show();
    fill('Urlop-2026', 'Urlop-2026');
    expect(await screen.findByText('Nowe hasło musi być inne niż tymczasowe.')).toBeInTheDocument();
  });

  it('success shows the saved notification and goes to /admin', async () => {
    const success = vi.spyOn(notify, 'success').mockImplementation(() => {});
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { user: { ...jan, mustChangePassword: false } } });
    show();
    fill(' Zażółć-1 ', ' Zażółć-1 ');
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/change-password', { newPassword: ' Zażółć-1 ', repeatPassword: ' Zażółć-1 ' });
    expect(success).toHaveBeenCalledWith('Hasło zapisane.');
    expect(auth.refresh).toHaveBeenCalled();
  });

  it('without a temporary password goes to /admin', async () => {
    auth.user = { ...jan, mustChangePassword: false };
    show();
    expect(await screen.findByText('Pulpit')).toBeInTheDocument();
  });

  it('has a logout link', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });

  it('logs out after inactivity like the panel', () => {
    vi.useFakeTimers();
    try {
      show();
      act(() => vi.advanceTimersByTime(30 * 60_000));
      expect(auth.logout).toHaveBeenCalledWith('idle');
    } finally {
      vi.useRealTimers();
    }
  });
});
