import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { LegendItem } from '../LegendItem';

describe('LegendItem', () => {
  it('shows the label next to a swatch with the given style and size', () => {
    renderWithProviders(<LegendItem label="Weekend albo święto" swatch={{ border: '1px dashed var(--mantine-color-dark-4)' }} w={18} h={12} />);
    const swatch = screen.getByText('Weekend albo święto').previousElementSibling as HTMLElement;
    expect(swatch.style.border).toBe('1px dashed var(--mantine-color-dark-4)');
    expect(swatch.style.width).toBe('calc(1.125rem * var(--mantine-scale))');
  });
});
