import { screen } from '@testing-library/react';
import { renderRoutes, renderWithProviders } from '../../test/render';
import { MyLeaveMockup } from '../my-leave/MyLeaveMockup';
import { TeamStrip } from '../../common/leave-request/TeamStrip';
import { toStrip } from '../leave-requests/requestView';
import { REQUESTS } from '../leave-requests/data';

// Przegląd Pulpitu: teksty karty puli i paska dni przeszły do common.json; makiety muszą pokazywać polskie napisy, nie klucze.
describe('mockups use the shared pool and strip texts', () => {
  it('My leave: pool card shows Polish texts', () => {
    renderRoutes([{ path: '/admin/my-leave', element: <MyLeaveMockup /> }], '/admin/my-leave');
    expect(screen.getByText('Urlop w 2026')).toBeInTheDocument();
    expect(screen.getByText(/dni do wykorzystania/)).toBeInTheDocument();
    expect(screen.queryByText(/pool_|legend_/)).toBeNull();
  });

  it('Leave request details: strip legend shows "weekend albo święto"', () => {
    renderWithProviders(<TeamStrip {...toStrip(REQUESTS[0]!)} />);
    expect(screen.getByText('weekend albo święto')).toBeInTheDocument();
    expect(screen.queryByText('strip_off')).toBeNull();
  });
});
