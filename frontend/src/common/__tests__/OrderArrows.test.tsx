import { fireEvent, screen } from '@testing-library/react';
import { OrderArrows } from '../OrderArrows';
import { renderWithProviders } from '../../test/render';

describe('OrderArrows', () => {
  it('first item cannot go up, last cannot go down', () => {
    const { unmount } = renderWithProviders(<OrderArrows index={0} count={3} onMove={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Przesuń wyżej' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Przesuń niżej' })).toBeEnabled();
    unmount();
    renderWithProviders(<OrderArrows index={2} count={3} onMove={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Przesuń wyżej' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Przesuń niżej' })).toBeDisabled();
  });

  it('click calls onMove with the direction', () => {
    const onMove = vi.fn();
    renderWithProviders(<OrderArrows index={1} count={3} onMove={onMove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Przesuń niżej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Przesuń wyżej' }));
    expect(onMove.mock.calls).toEqual([['down'], ['up']]);
  });
});
