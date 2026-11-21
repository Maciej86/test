import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/render';
import { DayStrip } from '../DayStrip';

describe('DayStrip', () => {
  it('Wigilia crossed out with its name; weekend crossed out; working day counted', () => {
    renderWithProviders(<DayStrip from="2026-12-21" to="2026-12-31" dayCount="working" />);
    expect(screen.getByLabelText('Dni wybranego terminu').children).toHaveLength(11);
    expect(screen.getByLabelText('24.12.2026: Wigilia Bożego Narodzenia')).toHaveAttribute('data-off', 'true');
    expect(screen.getByLabelText('26.12.2026: Boże Narodzenie (drugi dzień)')).toHaveAttribute('data-off', 'true');
    expect(screen.getByLabelText('27.12.2026: Weekend, nie liczy się')).toHaveAttribute('data-off', 'true');
    expect(screen.getByLabelText('21.12.2026: Dzień roboczy, liczy się do wniosku')).toHaveAttribute('data-off', 'false');
  });

  it('calendar days: weekend and holiday count too (not crossed out), holiday name stays in the tip', () => {
    renderWithProviders(<DayStrip from="2026-12-24" to="2026-12-27" dayCount="calendar" />);
    expect(screen.getByLabelText('24.12.2026: Wigilia Bożego Narodzenia, liczy się do wniosku (dni kalendarzowe)')).toHaveAttribute('data-off', 'false');
    expect(screen.getByLabelText('27.12.2026: Liczy się do wniosku (dni kalendarzowe)')).toHaveAttribute('data-off', 'false');
  });

  it('range longer than 45 days shows no strip', () => {
    renderWithProviders(<DayStrip from="2026-01-01" to="2026-02-15" dayCount="working" />);
    expect(screen.queryByLabelText('Dni wybranego terminu')).not.toBeInTheDocument();
  });
});
