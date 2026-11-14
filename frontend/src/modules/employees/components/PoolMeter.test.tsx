import { screen } from '@testing-library/react';
import type { EmployeePool } from '@app/shared';
import { renderWithProviders } from '../../../test/render';
import { PoolMeter } from './PoolMeter';

const pool = (o: Partial<EmployeePool>): EmployeePool => ({
  year: 2026, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 0, leftDays: 21, leftCarriedDays: 0, ...o,
});

describe('PoolMeter', () => {
  it('21 of 30 → "21" and "z 30 dni zostało"', () => {
    renderWithProviders(<PoolMeter pool={pool({})} />);
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('z 30 dni zostało')).toBeInTheDocument();
    expect(screen.getByLabelText('Zostało 21 z 30 dni')).toBeInTheDocument();
  });

  it('0 left → "pula wykorzystana"', () => {
    renderWithProviders(<PoolMeter pool={pool({ usedDays: 30, leftDays: 0 })} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('pula wykorzystana')).toBeInTheDocument();
  });

  it('note with Polish plural forms for carried and pending days', () => {
    const cases: [Partial<EmployeePool>, string][] = [
      [{ leftCarriedDays: 3, pendingDays: 1 }, 'w tym 3 dni zaległe, 1 dzień czeka na decyzję'],
      [{ leftCarriedDays: 1, pendingDays: 5 }, 'w tym 1 dzień zaległy, 5 dni czeka na decyzję'],
      [{ leftCarriedDays: 0, pendingDays: 2 }, '2 dni czekają na decyzję'],
    ];
    for (const [values, note] of cases) {
      const { unmount } = renderWithProviders(<PoolMeter pool={pool(values)} />);
      expect(screen.getByText(note)).toBeInTheDocument();
      unmount();
    }
  });

  it('null pool → "nie dotyczy"', () => {
    renderWithProviders(<PoolMeter pool={null} />);
    expect(screen.getByText('nie dotyczy')).toBeInTheDocument();
  });
});
