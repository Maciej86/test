import { screen, within } from '@testing-library/react';
import { LeaveStrip, type StripMark } from '../LeaveStrip';
import { renderWithProviders } from '../../test/render';

// 23–26.12.2026: 24, 25 i 26 to święta, 26 to też sobota.
const days = ['2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26'];
const range = (from: string, to: string, mark: StripMark) => (iso: string): StripMark => (iso >= from && iso <= to ? mark : 'none');

describe('LeaveStrip', () => {
  it('rows of people with marked days; days off crossed out with the holiday name', () => {
    renderWithProviders(
      <LeaveStrip
        days={days}
        rows={[
          { name: 'Jan Kowalski', markOn: range('2026-12-23', '2026-12-23', 'approved') },
          { name: 'Ewa Mazur', markOn: range('2026-12-23', '2026-12-26', 'pending') },
        ]}
        labels={{ approved: 'urlop zatwierdzony', pending: 'wniosek czeka na decyzję' }}
      />,
    );
    const rows = screen.getAllByTestId('strip-row');
    expect(rows.map((r) => r.getAttribute('data-name'))).toEqual(['Jan Kowalski', 'Ewa Mazur']);
    const cells = (i: number) => within(rows[i]!).getAllByTestId('strip-day');
    expect(cells(0).map((c) => c.getAttribute('data-mark'))).toEqual(['approved', 'none', 'none', 'none']);
    expect(cells(1)[0]).toHaveAttribute('aria-label', '23.12.2026: wniosek czeka na decyzję');
    expect(cells(1)[1]).toHaveAttribute('data-off', 'true');
    expect(cells(1)[1]).toHaveAttribute('aria-label', '24.12.2026: Wigilia Bożego Narodzenia');
  });

  it('legend only with the given labels, plus days off', () => {
    renderWithProviders(<LeaveStrip days={days} rows={[]} labels={{ approved: 'urlop zatwierdzony' }} />);
    expect(screen.getByText('urlop zatwierdzony')).toBeInTheDocument();
    expect(screen.queryByText('wniosek czeka na decyzję')).toBeNull();
    expect(screen.getByText('weekend albo święto')).toBeInTheDocument();
  });

  it('highlight marks one day in the header (today)', () => {
    renderWithProviders(<LeaveStrip days={days} rows={[]} labels={{}} highlight="2026-12-23" />);
    const header = screen.getAllByTestId('strip-header-day');
    expect(header.map((h) => h.getAttribute('data-today'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('working day without leave uses noneLabel in the tooltip', () => {
    renderWithProviders(<LeaveStrip days={['2026-12-23']} rows={[{ name: 'Jan Kowalski', markOn: () => 'none' }]} labels={{}} noneLabel="Dzień roboczy" />);
    expect(screen.getByTestId('strip-day')).toHaveAttribute('aria-label', '23.12.2026: Dzień roboczy');
  });
});
