import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderWithProviders } from '../test/render';
import { UserMenu } from './UserMenu';

function show(accountPath: string | null, onLogout = vi.fn()) {
  renderWithProviders(
    <MemoryRouter>
      <UserMenu name="Jan Kowalski" accountPath={accountPath} onLogout={onLogout} />
    </MemoryRouter>,
  );
  return onLogout;
}

describe('UserMenu', () => {
  it('shows the initials and opens the menu with my account and logout', async () => {
    const onLogout = show('/account/settings');
    expect(screen.getByText('JK')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Menu użytkownika'));
    expect((await screen.findByText('Moje konto')).closest('a')).toHaveAttribute('href', '/account/settings');
    fireEvent.click(screen.getByText('Wyloguj'));
    expect(onLogout).toHaveBeenCalled();
  });

  it('hides my account when the person has no such page', async () => {
    show(null);
    fireEvent.click(screen.getByLabelText('Menu użytkownika'));
    expect(await screen.findByText('Wyloguj')).toBeInTheDocument();
    expect(screen.queryByText('Moje konto')).not.toBeInTheDocument();
  });
});
