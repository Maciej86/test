import { screen } from '@testing-library/react';
import { DetailRow } from '../DetailRow';
import { renderWithProviders } from '../../test/render';

describe('DetailRow', () => {
  it('shows the label and the value', () => {
    renderWithProviders(<DetailRow label="Login">jan.kowalski@firma.pl</DetailRow>);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('jan.kowalski@firma.pl')).toBeInTheDocument();
  });

  it('a long value breaks instead of widening the screen', () => {
    renderWithProviders(<DetailRow label="Login">bardzo.dlugi.adres.ktory.sie.nie.miesci@firma.pl</DetailRow>);
    expect(screen.getByText('bardzo.dlugi.adres.ktory.sie.nie.miesci@firma.pl')).toHaveStyle({ overflowWrap: 'anywhere' });
  });
});
