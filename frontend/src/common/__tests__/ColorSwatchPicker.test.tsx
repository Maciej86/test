import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { ColorMark, ColorSwatchPicker } from '../ColorSwatchPicker';

const names: Record<string, string> = { green: 'zielony', teal: 'morski', grape: 'fioletowy' };

describe('ColorSwatchPicker', () => {
  it('one button per color with its name; the chosen one is pressed; click picks a color', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ColorSwatchPicker label="Kolor w kalendarzu" description="Opis" colors={['green', 'teal', 'grape']} value="teal" onChange={onChange} labelOf={(c) => names[c]!} />,
    );
    expect(screen.getByText('Kolor w kalendarzu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'morski' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'zielony' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'fioletowy' }));
    expect(onChange).toHaveBeenCalledWith('grape');
  });

  it('ColorMark: small square with the color name for screen readers', () => {
    renderWithProviders(<ColorMark color="grape" label="fioletowy" />);
    expect(screen.getByLabelText('fioletowy')).toBeInTheDocument();
  });
});
