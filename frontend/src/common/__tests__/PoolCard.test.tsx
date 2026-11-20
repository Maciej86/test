import { screen, within } from '@testing-library/react';
import { Button } from '@mantine/core';
import { PoolCard } from '../PoolCard';
import { renderWithProviders } from '../../test/render';

const pool = { year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 8, pendingDays: 2, pendingCarried: 0, leftDays: 16, leftCarriedDays: 0 };

describe('PoolCard', () => {
  it('shows the days left of the total, the legend and the hint', () => {
    renderWithProviders(<PoolCard pool={pool} />);
    expect(screen.getByText('Urlop w 2026')).toBeInTheDocument();
    expect(screen.getByText('16', { selector: '[data-left]' })).toHaveAttribute('data-left', 'some');
    expect(screen.getByText('dni do wykorzystania (z 30)')).toBeInTheDocument();
    expect(screen.getByLabelText('Zostało 16 z 30 dni')).toBeInTheDocument();
    const legend = screen.getByTestId('pool-legend');
    expect(legend).toHaveTextContent('12 wykorzystane');
    expect(legend).toHaveTextContent('2 czeka na decyzję');
    expect(legend).toHaveTextContent('0 zostało z zaległego z 2025');
    expect(legend).toHaveTextContent('16 zostało z puli rocznej');
    expect(screen.getByText(/Pula na rok: 26 dni, zaległy urlop z 2025: 4 dni/)).toBeInTheDocument();
  });

  it('nothing left → number marked as none', () => {
    renderWithProviders(<PoolCard pool={{ ...pool, usedAnnual: 24, leftDays: 0 }} />);
    expect(screen.getByText('0', { selector: '[data-left]' })).toHaveAttribute('data-left', 'none');
  });

  it('actions are shown at the bottom of the card', () => {
    renderWithProviders(<PoolCard pool={pool} actions={<Button>Złóż wniosek</Button>} />);
    const card = screen.getByText('Urlop w 2026').closest('.mantine-Card-root') as HTMLElement;
    expect(within(card).getByRole('button', { name: 'Złóż wniosek' })).toBeInTheDocument();
  });
});
