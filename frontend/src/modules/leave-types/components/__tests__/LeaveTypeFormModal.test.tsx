import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { LeaveTypeItem } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { renderWithProviders } from '../../../../test/render';
import { HideLeaveTypeModal } from '../HideLeaveTypeModal';
import { LeaveTypeFormModal } from '../LeaveTypeFormModal';

const onDemand: LeaveTypeItem = { id: 2, name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, color: 'teal', dayCount: 'working', requiresApproval: true, hidden: false, requestsCount: 3 };

const conflict = (message: string, hiddenType?: { id: number; name: string }) => {
  const config = { url: '/leave-types', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status: 409, statusText: 'Conflict', headers: {}, config,
    data: { error: { message, fields: { name: message }, hiddenType } },
  });
};

const show = (leaveType: LeaveTypeItem | null) => {
  const onClose = vi.fn();
  renderWithProviders(<LeaveTypeFormModal leaveType={leaveType} onClose={onClose} />);
  return { onClose };
};
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

afterEach(() => vi.restoreAllMocks());

describe('LeaveTypeFormModal', () => {
  it('adding: "Deducts days" is on, empty name → required', async () => {
    const post = vi.spyOn(api, 'post');
    show(null);
    expect(screen.getByText('Dodaj typ urlopu', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByLabelText('Odejmuje dni z puli', { exact: false })).toBeChecked();
    save();
    expect(await screen.findByText('To pole jest wymagane.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('color: new type is green; editing keeps the type color; click on "fioletowy" sends grape', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 8 } });
    show(null);
    expect(screen.getByText('Kolor w kalendarzu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'zielony' })).toHaveAttribute('aria-pressed', 'true');
    fill('Nazwa', 'Chorobowe');
    fireEvent.click(screen.getByRole('button', { name: 'fioletowy' }));
    save();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/leave-types', { name: 'Chorobowe', deductsPool: true, yearlyLimit: '', color: 'grape', dayCount: 'working', requiresApproval: true }));
  });

  it('day count and approval: new type counts working days and needs approval; choosing calendar days and no approval sends them', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 9 } });
    show(null);
    expect(screen.getByRole('radio', { name: /dni robocze/ })).toBeChecked();
    expect(screen.getByLabelText('Wymaga zatwierdzenia', { exact: false })).toBeChecked();
    fill('Nazwa', 'Ojcowski');
    fireEvent.click(screen.getByRole('radio', { name: /dni kalendarzowe/ }));
    fireEvent.click(screen.getByLabelText('Wymaga zatwierdzenia', { exact: false }));
    save();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/leave-types', { name: 'Ojcowski', deductsPool: true, yearlyLimit: '', color: 'green', dayCount: 'calendar', requiresApproval: false }));
  });

  it('editing a calendar-day type without approval shows its settings', () => {
    show({ ...onDemand, dayCount: 'calendar', requiresApproval: false });
    expect(screen.getByRole('radio', { name: /dni kalendarzowe/ })).toBeChecked();
    expect(screen.getByLabelText('Wymaga zatwierdzenia', { exact: false })).not.toBeChecked();
  });

  it('color of an edited type is preselected', () => {
    show(onDemand);
    expect(screen.getByRole('button', { name: 'morski' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('limit 0 and 366 → error under the field; cleared limit is sent empty (server saves NULL)', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 6 } });
    show(null);
    fill('Nazwa', 'Szkoleniowy');
    fill('Limit dni w roku', '0');
    save();
    expect(await screen.findByText('Wartość jest za mała.')).toBeInTheDocument();
    fill('Limit dni w roku', '366');
    save();
    expect(await screen.findByText('Wartość jest za duża.')).toBeInTheDocument();
    fill('Limit dni w roku', '');
    save();
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-types', { name: 'Szkoleniowy', deductsPool: true, yearlyLimit: '', color: 'green', dayCount: 'working', requiresApproval: true }));
  });

  it('editing a type used in requests shows the warning; 0 requests → no warning', () => {
    show(onDemand);
    expect(screen.getByText('Edytuj typ „Na żądanie”')).toBeInTheDocument();
    expect(screen.getByText(/Ten typ jest w 3 wnioskach/)).toBeInTheDocument();
    expect(screen.getByLabelText('Limit dni w roku', { exact: false })).toHaveValue('4 dni');
  });

  it('no warning for a type without requests', () => {
    show({ ...onDemand, requestsCount: 0 });
    expect(screen.queryByText(/Ten typ jest w/)).not.toBeInTheDocument();
  });

  it('editing: clearing the limit sends it empty (server saves NULL = no limit)', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    show(onDemand);
    fill('Limit dni w roku', '');
    save();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/leave-types/2', { name: 'Na żądanie', deductsPool: true, yearlyLimit: '', color: 'teal', dayCount: 'working', requiresApproval: true }));
  });

  it('409 name_taken → error under the name', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(conflict('leave-types.server.name_taken'));
    show(onDemand);
    fill('Nazwa', 'Wypoczynkowy');
    save();
    expect(await screen.findByText('Typ o tej nazwie już jest.')).toBeInTheDocument();
  });

  it('409 name_taken_hidden → restore link unhides, closes and shows a toast', async () => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/leave-types') throw conflict('leave-types.server.name_taken_hidden', { id: 7, name: 'Szkoleniowy' });
      return { data: { ok: true } };
    });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(null);
    fill('Nazwa', 'szkoleniowy');
    save();
    expect(await screen.findByText(/Typ „Szkoleniowy” już jest, ukryty./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć go' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/leave-types/7/unhide'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ jest znowu w formularzu wniosku'));
    expect(onClose).toHaveBeenCalled();
  });

  it('success → toast and close', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(onDemand);
    save();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/leave-types/2', { name: 'Na żądanie', deductsPool: true, yearlyLimit: 4, color: 'teal', dayCount: 'working', requiresApproval: true }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Zapisano zmiany'));
    expect(onClose).toHaveBeenCalled();
  });

  it('other server error → error toast', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('down'));
    const error = vi.spyOn(notify, 'error');
    show(null);
    fill('Nazwa', 'Szkoleniowy');
    save();
    await waitFor(() => expect(error).toHaveBeenCalled());
  });
});

describe('HideLeaveTypeModal', () => {
  it('shows the name and requests count; "Hide" shows a toast', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const onClose = vi.fn();
    renderWithProviders(<HideLeaveTypeModal leaveType={onDemand} onClose={onClose} />);
    expect(screen.getByText('Ukryć typ „Na żądanie”?')).toBeInTheDocument();
    expect(screen.getByText(/3 wnioski z tym typem zostają bez zmian/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-types/2/hide'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ ukryty'));
    expect(onClose).toHaveBeenCalled();
  });

  it('server error → error toast, the window stays open', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('fail'));
    const error = vi.spyOn(notify, 'error');
    const onClose = vi.fn();
    renderWithProviders(<HideLeaveTypeModal leaveType={onDemand} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj' }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
