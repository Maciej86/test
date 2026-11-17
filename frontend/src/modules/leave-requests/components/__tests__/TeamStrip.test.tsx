import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/render';
import { TeamStrip } from '../TeamStrip';

const piotr = { employeeName: 'Piotr Zieliński', dateFrom: '2026-12-21', dateTo: '2026-12-24' };
const tomasz = { employeeName: 'Tomasz Wójcik', dateFrom: '2026-12-21', dateTo: '2026-12-22', status: 'approved' as const };

describe('TeamStrip', () => {
  it('21–24.12: 24.12 is crossed out, Tomasz is green on 21–22, a pending request is yellow', () => {
    renderWithProviders(
      <TeamStrip request={piotr} others={[tomasz, { employeeName: 'Ewa Mazur', dateFrom: '2026-12-23', dateTo: '2026-12-30', status: 'pending' }]} />,
    );
    const rows = screen.getAllByTestId('strip-row');
    expect(rows.map((r) => r.getAttribute('data-name'))).toEqual(['Piotr Zieliński', 'Tomasz Wójcik', 'Ewa Mazur']);
    const cells = (i: number) => within(rows[i]!).getAllByTestId('strip-day');
    expect(cells(0)).toHaveLength(4);
    expect(cells(0).map((c) => c.getAttribute('data-mark'))).toEqual(['request', 'request', 'request', 'request']);
    expect(cells(0)[3]).toHaveAttribute('data-off', 'true');
    expect(cells(0)[3]).toHaveAttribute('aria-label', '24.12.2026: Wigilia Bożego Narodzenia');
    expect(cells(1).map((c) => c.getAttribute('data-mark'))).toEqual(['approved', 'approved', 'none', 'none']);
    expect(cells(2).map((c) => c.getAttribute('data-mark'))).toEqual(['none', 'none', 'pending', 'pending']);
    expect(screen.queryByText('W tym terminie nikt inny nie ma urlopu.')).toBeNull();
  });

  it('nobody else → "W tym terminie nikt inny nie ma urlopu."', () => {
    renderWithProviders(<TeamStrip request={piotr} others={[]} />);
    expect(screen.getByText('W tym terminie nikt inny nie ma urlopu.')).toBeInTheDocument();
  });

  it('more than 31 days → list of people with dates instead of the strip', () => {
    renderWithProviders(<TeamStrip request={{ ...piotr, dateFrom: '2026-07-01', dateTo: '2026-08-14' }} others={[{ ...tomasz, dateFrom: '2026-07-06', dateTo: '2026-07-10' }]} />);
    expect(screen.queryAllByTestId('strip-row')).toHaveLength(0);
    expect(screen.getByText(/Tomasz Wójcik/).closest('li')).toHaveTextContent('Tomasz Wójcik: 06.07.2026 – 10.07.2026 (urlop zatwierdzony)');
  });
});
