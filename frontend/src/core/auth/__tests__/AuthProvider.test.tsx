import { act, screen } from '@testing-library/react';
import { api, sessionRedirect } from '../../api/client';
import { renderWithProviders } from '../../../test/render';
import { AuthProvider, useAuth } from '../AuthProvider';

function LogoutButtons() {
  const { logout } = useAuth();
  return (
    <>
      <button onClick={() => void logout()}>zwykłe</button>
      <button onClick={() => void logout('idle')}>bezczynność</button>
    </>
  );
}

describe('AuthProvider', () => {
  const go = vi.spyOn(sessionRedirect, 'go').mockImplementation(() => {});
  beforeEach(() => {
    go.mockClear();
    vi.spyOn(api, 'get').mockRejectedValue(new Error('401'));
    vi.spyOn(api, 'post').mockResolvedValue({ status: 204 });
  });

  it('logout calls the server, tells other tabs and goes to /login', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderWithProviders(<AuthProvider><LogoutButtons /></AuthProvider>);
    await act(async () => screen.getByText('zwykłe').click());
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(setItem).toHaveBeenCalledWith('app.logoutAt', expect.any(String));
    expect(go).toHaveBeenCalledWith('/login');
  });

  it('logout after inactivity goes to /login?reason=idle', async () => {
    renderWithProviders(<AuthProvider><LogoutButtons /></AuthProvider>);
    await act(async () => screen.getByText('bezczynność').click());
    expect(go).toHaveBeenCalledWith('/login?reason=idle');
  });
});
