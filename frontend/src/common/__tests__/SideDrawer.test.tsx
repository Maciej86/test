import { fireEvent, screen } from '@testing-library/react';
import { SideDrawer } from '../SideDrawer';
import { renderWithProviders } from '../../test/render';

describe('SideDrawer', () => {
  it('shows the title and content, the close button calls onClose', () => {
    const onClose = vi.fn();
    renderWithProviders(<SideDrawer title="Szczegóły" onClose={onClose}>Treść panelu</SideDrawer>);
    expect(screen.getByText('Szczegóły')).toBeInTheDocument();
    expect(screen.getByText('Treść panelu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opened={false} hides the content', () => {
    renderWithProviders(<SideDrawer opened={false} title="Szczegóły" onClose={() => {}}>Treść panelu</SideDrawer>);
    expect(screen.queryByText('Treść panelu')).not.toBeInTheDocument();
  });
});
