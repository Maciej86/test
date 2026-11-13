import { fireEvent, screen } from '@testing-library/react';
import { MockupApp } from '../App';
import { useMockupRole } from './mockupRole';
import { renderWithProviders } from '../test/render';

function RoleProbe() {
  const role = useMockupRole();
  return <p>Rola: {role}</p>;
}

describe('useMockupRole', () => {
  it('gives screens the role chosen in the bar', async () => {
    renderWithProviders(
      <MockupApp
        navigation={[{ key: 'dashboard', path: '/admin', label: 'common.nav.dashboard', icon: 'house', roles: ['admin', 'user'] }]}
        screens={{ dashboard: RoleProbe }}
        initialPath="/admin"
      />,
    );
    expect(await screen.findByText('Rola: admin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Użytkownik' }));
    expect(await screen.findByText('Rola: user')).toBeInTheDocument();
  });
});
