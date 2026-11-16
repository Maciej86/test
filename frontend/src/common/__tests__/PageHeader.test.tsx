import { Button } from '@mantine/core';
import { screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';
import { renderWithProviders } from '../../test/render';

describe('PageHeader', () => {
  it('shows the title as the main heading, the subtitle and the actions', () => {
    renderWithProviders(<PageHeader title="Pracownicy" subtitle="3 osoby" actions={<Button>Dodaj</Button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Pracownicy' })).toBeInTheDocument();
    expect(screen.getByText('3 osoby')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj' })).toBeInTheDocument();
  });

  it('works with the title only', () => {
    renderWithProviders(<PageHeader title="Powiadomienia" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Powiadomienia' })).toBeInTheDocument();
  });
});
