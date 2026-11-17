import { fireEvent, screen } from '@testing-library/react';
import { ListPagination } from '../ListPagination';
import { renderWithProviders } from '../../test/render';

describe('ListPagination', () => {
  it('hidden when everything fits on one page', () => {
    renderWithProviders(<ListPagination data={{ total: 25, pageSize: 25 }} page={1} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
  });

  it('shows the page count and changes the page', () => {
    const onChange = vi.fn();
    renderWithProviders(<ListPagination data={{ total: 51, pageSize: 25 }} page={1} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
