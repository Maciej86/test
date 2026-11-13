import { fireEvent, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { Button } from '@mantine/core';
import { DataState } from './DataState';
import { renderWithProviders } from '../test/render';

const base = { isPending: false, isError: false, error: null, refetch: vi.fn() };

describe('DataState', () => {
  it('shows a loader while loading', () => {
    renderWithProviders(<DataState query={{ ...base, isPending: true }}>treść</DataState>);
    expect(screen.getByLabelText('Wczytywanie…')).toBeInTheDocument();
    expect(screen.queryByText('treść')).not.toBeInTheDocument();
  });

  it('shows the error and retries on click', () => {
    const refetch = vi.fn();
    renderWithProviders(
      <DataState query={{ ...base, isError: true, error: new AxiosError('x', 'ERR_NETWORK'), refetch }}>treść</DataState>,
    );
    expect(screen.getByText('Brak połączenia z serwerem. Czy backend działa? (npm run dev)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty text and action', () => {
    renderWithProviders(
      <DataState query={base} isEmpty emptyText="Brak klientów." emptyAction={<Button>Dodaj klienta</Button>}>
        treść
      </DataState>,
    );
    expect(screen.getByText('Brak klientów.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj klienta' })).toBeInTheDocument();
  });

  it('shows the content when data is there', () => {
    renderWithProviders(<DataState query={base}>treść</DataState>);
    expect(screen.getByText('treść')).toBeInTheDocument();
  });
});
