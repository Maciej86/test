import { screen } from '@testing-library/react';
import { OrderArrows } from '../OrderArrows';
import { renderWithProviders } from '../../test/render';

describe('OrderArrows', () => {
  it('disables "up" on the first item', () => {
    renderWithProviders(<OrderArrows index={0} count={3} />);
    expect(screen.getByRole('button', { name: 'Przesuń wyżej' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Przesuń niżej' })).toBeEnabled();
  });

  it('disables "down" on the last item', () => {
    renderWithProviders(<OrderArrows index={2} count={3} />);
    expect(screen.getByRole('button', { name: 'Przesuń wyżej' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Przesuń niżej' })).toBeDisabled();
  });
});
