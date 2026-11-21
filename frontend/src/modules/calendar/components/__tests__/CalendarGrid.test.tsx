import { fireEvent, screen, within } from '@testing-library/react';
import { calendarDays, type CalendarAbsence } from '@app/shared';
import { renderWithProviders } from '../../../../test/render';
import { CalendarGrid } from '../CalendarGrid';

const days = calendarDays('2026-11-17', 61);
const people = [{ id: 2, name: 'Jan Kowalski' }, { id: 5, name: 'Magdalena Lewandowska' }];
const absences: CalendarAbsence[] = [
  { id: 21, userId: 2, leaveTypeName: 'Wypoczynkowy', color: 'green', status: 'pending', dateFrom: '2026-11-26', dateTo: '2026-11-27', days: 2 },
  { id: 20, userId: 5, leaveTypeName: 'Wypoczynkowy', color: 'green', status: 'approved', dateFrom: '2026-11-20', dateTo: '2026-11-24', days: 3 },
];

const show = () => {
  const onOpen = vi.fn();
  renderWithProviders(<CalendarGrid days={days} people={people} absences={absences} today="2026-11-17" onOpen={onOpen} />);
  return { onOpen };
};

describe('CalendarGrid', () => {
  it('one row per person, month headers and 61 day numbers, today marked', () => {
    show();
    expect(screen.getAllByTestId('calendar-row')).toHaveLength(2);
    expect(screen.getByText('Listopad 2026')).toBeInTheDocument();
    expect(screen.getByText('Grudzień 2026')).toBeInTheDocument();
    expect(screen.getByText('Styczeń 2027')).toBeInTheDocument();
    expect(screen.getAllByTestId('calendar-day')).toHaveLength(61);
    expect(screen.getAllByTestId('calendar-day')[0]).toHaveAttribute('data-today', 'true');
  });

  it('pending request → light bar with "(czeka)" and dashed border', () => {
    show();
    const bar = screen.getByRole('button', { name: 'Jan Kowalski: Wypoczynkowy (czeka)' });
    expect(bar).toHaveAttribute('data-pending', 'true');
    expect(bar).toHaveTextContent('Wypoczynkowy (czeka)');
  });

  it('working days leave over a weekend → two bars and a bridge', () => {
    show();
    const row = screen.getAllByTestId('calendar-row')[1]!;
    expect(within(row).getAllByRole('button', { name: 'Magdalena Lewandowska: Wypoczynkowy' })).toHaveLength(2);
    expect(within(row).getAllByTestId('calendar-bridge')).toHaveLength(1);
  });

  it('weekend and holiday days are marked off; holiday has its name', () => {
    show();
    const day = (iso: string) => screen.getAllByTestId('calendar-day')[days.indexOf(iso)]!;
    expect(day('2026-11-21')).toHaveAttribute('data-off', 'true');
    expect(day('2026-12-24')).toHaveAttribute('data-off', 'true');
    expect(day('2026-12-24')).toHaveAttribute('aria-label', expect.stringContaining('Wigilia'));
    expect(day('2026-11-23')).toHaveAttribute('data-off', 'false');
  });

  it('click on a bar opens details; bars are real buttons (Enter and Space work natively)', () => {
    const { onOpen } = show();
    const bar = screen.getByRole('button', { name: 'Jan Kowalski: Wypoczynkowy (czeka)' });
    fireEvent.click(bar);
    expect(onOpen).toHaveBeenCalledWith(21);
    expect(bar.tagName).toBe('BUTTON');
  });
});
