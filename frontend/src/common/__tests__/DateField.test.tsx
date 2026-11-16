import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { DateField } from '../DateField';

describe('DateField', () => {
  it('shows a RRRR-MM-DD value as DD.MM.RRRR', () => {
    renderWithProviders(<DateField label="Data zatrudnienia" value="2024-03-01" onChange={() => {}} />);
    expect(screen.getByLabelText('Data zatrudnienia')).toHaveValue('01.03.2024');
  });

  it('typed 15.04.2025 → onChange("2025-04-15")', () => {
    const onChange = vi.fn();
    renderWithProviders(<DateField label="Data zatrudnienia" value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Data zatrudnienia');
    fireEvent.change(input, { target: { value: '15.04.2025' } });
    expect(onChange).toHaveBeenLastCalledWith('2025-04-15');
  });
});
