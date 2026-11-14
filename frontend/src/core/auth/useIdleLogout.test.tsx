import { act, fireEvent, screen } from '@testing-library/react';
import { USER_ACTIVITY_HEADER } from '@app/shared';
import { api } from '../api/client';
import { renderWithProviders } from '../../test/render';
import { IdleWarningModal } from '../../common/IdleWarningModal';
import { markActivity } from './activity';

const logout = vi.fn(async () => {});
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ logout }) }));

const MINUTE = 60_000;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('idle logout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'));
    localStorage.clear();
    markActivity();
    logout.mockClear();
    vi.spyOn(api, 'get').mockResolvedValue({ data: {} });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows no warning at 28:59 and the warning with 60 s at 29:00', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(28 * MINUTE + 59_000);
    expect(screen.queryByText('Zaraz Cię wylogujemy')).not.toBeInTheDocument();
    advance(1000);
    expect(screen.getByText('Zaraz Cię wylogujemy')).toBeInTheDocument();
    expect(screen.getByText(/Za 60 s wylogujemy Cię/)).toBeInTheDocument();
    advance(10_000);
    expect(screen.getByText(/Za 50 s wylogujemy Cię/)).toBeInTheDocument();
  });

  it('logs out with reason idle at 30:00', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(30 * MINUTE - 1000);
    expect(logout).not.toHaveBeenCalled();
    advance(1000);
    expect(logout).toHaveBeenCalledWith('idle');
    advance(5000);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('stay logged in closes the warning and pings /auth/me with the activity header', async () => {
    renderWithProviders(<IdleWarningModal />);
    advance(29 * MINUTE);
    vi.mocked(api.get).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Zostań zalogowany' }));
    expect(api.get).toHaveBeenCalledWith('/auth/me', { headers: { [USER_ACTIVITY_HEADER]: '1' } });
    advance(1000);
    expect(screen.queryByText('Zaraz Cię wylogujemy')).not.toBeInTheDocument();
    advance(28 * MINUTE);
    expect(logout).not.toHaveBeenCalled();
  });

  it('logout now in the warning logs out without a reason', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(29 * MINUTE);
    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj teraz' }));
    expect(logout).toHaveBeenCalledWith();
  });

  it('mouse movement does not close the open warning', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(29 * MINUTE);
    fireEvent.mouseMove(window);
    fireEvent.keyDown(window, { key: 'a' });
    advance(1000);
    expect(screen.getByText('Zaraz Cię wylogujemy')).toBeInTheDocument();
  });

  it('activity before the warning postpones it and keeps the server session alive', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(20 * MINUTE);
    fireEvent.mouseMove(window);
    advance(1000);
    expect(api.get).toHaveBeenCalledWith('/auth/me', { headers: { [USER_ACTIVITY_HEADER]: '1' } });
    advance(20 * MINUTE);
    expect(screen.queryByText('Zaraz Cię wylogujemy')).not.toBeInTheDocument();
  });

  it('activity in another tab postpones the warning', () => {
    renderWithProviders(<IdleWarningModal />);
    advance(29 * MINUTE);
    expect(screen.getByText('Zaraz Cię wylogujemy')).toBeInTheDocument();
    localStorage.setItem('app.lastActivityAt', String(Date.now()));
    advance(1000);
    expect(screen.queryByText('Zaraz Cię wylogujemy')).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('logging in after a long break starts counting from now, not from the old activity', () => {
    // Ostatnia czynność 45 minut temu (np. przed wylogowaniem po bezczynności), potem logowanie bez przeładowania.
    markActivity(Date.now() - 45 * MINUTE);
    renderWithProviders(<IdleWarningModal />);
    advance(2000);
    expect(logout).not.toHaveBeenCalled();
    expect(screen.queryByText('Zaraz Cię wylogujemy')).not.toBeInTheDocument();
  });
});
