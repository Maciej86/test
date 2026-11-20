import { screen } from '@testing-library/react';
import { RoleBadge } from '../RoleBadge';
import { renderWithProviders } from '../../test/render';

describe('RoleBadge', () => {
  it('shows the role name', () => {
    renderWithProviders(<><RoleBadge role="admin" /><RoleBadge role="employee" /></>);
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Pracownik')).toBeInTheDocument();
  });
});
