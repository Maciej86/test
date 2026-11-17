import { screen } from '@testing-library/react';
import { LEAVE_STATUS_COLOR, LeaveDates, LeaveStatusBadge, leaveSplitText } from '../LeaveRequestParts';
import { i18n, renderWithProviders } from '../../test/render';

const t = i18n.t.bind(i18n);
const request = { status: 'approved' as const, daysFromCarried: 4, daysFromAnnual: 2, poolYear: 2026 };

describe('LeaveRequestParts', () => {
  it('status colours follow DESIGN.md (cancelled is red, withdrawn gray)', () => {
    expect(LEAVE_STATUS_COLOR).toEqual({ pending: 'yellow', approved: 'green', rejected: 'red', withdrawn: 'gray', cancelled: 'red' });
  });

  it('badge shows the status name', () => {
    renderWithProviders(<LeaveStatusBadge status="pending" />);
    expect(screen.getByText('Czeka na decyzję')).toBeInTheDocument();
  });

  it('dates: a range with a dash, one day without', () => {
    const { unmount } = renderWithProviders(<p><LeaveDates from="2026-11-26" to="2026-11-27" /></p>);
    expect(screen.getByText(/26\.11\.2026/).closest('p')).toHaveTextContent('26.11.2026 – 27.11.2026');
    unmount();
    renderWithProviders(<p><LeaveDates from="2026-10-09" to="2026-10-09" /></p>);
    expect(screen.getByText('09.10.2026').closest('p')).toHaveTextContent(/^09\.10\.2026$/);
  });

  it('split text: carried and annual, not deducting, not counted', () => {
    expect(leaveSplitText(t, request)).toBe('4 z zaległego, 2 z puli 2026');
    expect(leaveSplitText(t, { ...request, daysFromCarried: 0, daysFromAnnual: 0 })).toBe('nie odejmuje z puli');
    expect(leaveSplitText(t, { ...request, status: 'cancelled' })).toBe('nie liczą się do puli');
  });
});
