import { Button } from '@mantine/core';
import { screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { renderWithProviders } from '../../test/render';

describe('EmptyState', () => {
  it('shows the icon, title, text and action', () => {
    const { container } = renderWithProviders(
      <EmptyState icon={Users} title="Nie ma pracowników" text="Dodaj pierwszą osobę." action={<Button>Dodaj</Button>} />,
    );
    expect(screen.getByRole('heading', { name: 'Nie ma pracowników' })).toBeInTheDocument();
    expect(screen.getByText('Dodaj pierwszą osobę.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj' })).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('works with the text only', () => {
    const { container } = renderWithProviders(<EmptyState text="Brak powiadomień." />);
    expect(screen.getByText('Brak powiadomień.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
