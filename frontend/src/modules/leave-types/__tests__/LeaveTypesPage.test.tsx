import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { LeaveTypeItem } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { LeaveTypesPage } from '../LeaveTypesPage';

const type = (o: Partial<LeaveTypeItem>): LeaveTypeItem => ({
  id: 1, name: 'Wypoczynkowy', deductsPool: true, yearlyLimit: null, hidden: false, requestsCount: 0, ...o,
});
const vacation = type({});
const onDemand = type({ id: 2, name: 'Na żądanie', yearlyLimit: 4, requestsCount: 3 });
const unpaid = type({ id: 4, name: 'Bezpłatny', deductsPool: false });
const training = type({ id: 7, name: 'Szkoleniowy', hidden: true });

const show = (items: LeaveTypeItem[]) => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { items } });
  renderWithProviders(<LeaveTypesPage />);
};
const rowOf = async (name: string) => within(await screen.findByRole('table')).getByText(name).closest('tr')!;

afterEach(() => vi.restoreAllMocks());

describe('LeaveTypesPage', () => {
  it('shows the summary with visible and hidden counts', async () => {
    show([vacation, onDemand, unpaid, training]);
    expect(await screen.findByText('W formularzu wniosku: 3. Ukryte: 1.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/leave-types');
  });

  it('"Show hidden" is off at start; on → hidden type with badge and without arrows', async () => {
    show([vacation, onDemand, training]);
    const table = await screen.findByRole('table');
    expect(within(table).queryByText('Szkoleniowy')).not.toBeInTheDocument();
    const toggle = screen.getByLabelText('Pokaż ukryte (1)');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    const row = await rowOf('Szkoleniowy');
    expect(within(row).getByText('ukryty')).toBeInTheDocument();
    expect(within(row).getByText('Nie ma go w formularzu nowego wniosku')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Przesuń wyżej' })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Przywróć' })).toBeInTheDocument();
  });

  it('no "Show hidden" switch when nothing is hidden', async () => {
    show([vacation, onDemand]);
    await screen.findByRole('table');
    expect(screen.queryByText(/Pokaż ukryte/)).not.toBeInTheDocument();
  });

  it('arrows disabled at the edges; click calls move up/down', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    show([vacation, onDemand, unpaid]);
    expect(within(await rowOf('Wypoczynkowy')).getByRole('button', { name: 'Przesuń wyżej' })).toBeDisabled();
    expect(within(await rowOf('Bezpłatny')).getByRole('button', { name: 'Przesuń niżej' })).toBeDisabled();
    fireEvent.click(within(await rowOf('Na żądanie')).getByRole('button', { name: 'Przesuń wyżej' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-types/2/move', { direction: 'up' }));
    fireEvent.click(within(await rowOf('Na żądanie')).getByRole('button', { name: 'Przesuń niżej' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-types/2/move', { direction: 'down' }));
  });

  it('limit text, no limit, deducts badges and requests count', async () => {
    show([vacation, onDemand, unpaid]);
    const demand = await rowOf('Na żądanie');
    expect(within(demand).getByText('4 dni na osobę')).toBeInTheDocument();
    expect(within(demand).getByText('odejmuje')).toBeInTheDocument();
    expect(within(demand).getByText('3')).toBeInTheDocument();
    expect(within(await rowOf('Wypoczynkowy')).getByText('bez limitu')).toBeInTheDocument();
    expect(within(await rowOf('Bezpłatny')).getByText('nie odejmuje')).toBeInTheDocument();
  });

  it('"Hide" disabled for the only visible type', async () => {
    show([vacation, training]);
    expect(within(await rowOf('Wypoczynkowy')).getByRole('button', { name: 'Ukryj' })).toBeDisabled();
  });

  it('"Hide" opens the confirmation window', async () => {
    show([vacation, onDemand]);
    fireEvent.click(within(await rowOf('Na żądanie')).getByRole('button', { name: 'Ukryj' }));
    expect(await screen.findByText('Ukryć typ „Na żądanie”?')).toBeInTheDocument();
  });

  it('"Restore" calls unhide and shows a toast', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show([vacation, training]);
    fireEvent.click(await screen.findByLabelText('Pokaż ukryte (1)'));
    fireEvent.click(within(await rowOf('Szkoleniowy')).getByRole('button', { name: 'Przywróć' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-types/7/unhide'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ jest znowu w formularzu wniosku'));
  });

  it('server error → error state with retry', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('down'));
    renderWithProviders(<LeaveTypesPage />);
    expect(await screen.findByRole('button', { name: /Spróbuj ponownie/ })).toBeInTheDocument();
  });
});
