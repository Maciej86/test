import { screen } from '@testing-library/react';
import { Done } from './Done';
import { renderWithProviders } from '../test/render';

describe('Done', () => {
  it('shows the module name from its navigation label key', () => {
    renderWithProviders(<Done labelKey="common.nav.dashboard" />);
    expect(screen.getByText('Pulpit')).toBeInTheDocument();
    expect(screen.getByText('Tę część już wykonano.')).toBeInTheDocument();
  });
});
