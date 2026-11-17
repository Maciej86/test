import { fireEvent, screen, waitFor } from '@testing-library/react';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { apiError, details, requestItem } from '../../../../test/leaveRequestFixtures';
import { renderWithProviders } from '../../../../test/render';
import { ApproveModal, CancelModal, RejectModal } from '../DecisionModals';

const tomasz = { employeeName: 'Tomasz Wójcik', dateFrom: '2026-11-26', dateTo: '2026-11-27', status: 'approved' as const };
const show = (ui: (p: { onClose: () => void; onDone: () => void }) => React.ReactElement) => {
  const onClose = vi.fn();
  const onDone = vi.fn();
  renderWithProviders(ui({ onClose, onDone }));
  return { onClose, onDone };
};
const reasonField = () => screen.getByRole('textbox', { name: /Powód/ });

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: details({ others: [tomasz, { ...tomasz, employeeName: 'Ewa Mazur', status: 'pending' }] }) });
});
afterEach(() => vi.restoreAllMocks());

describe('decision modals', () => {
  it('approve: green button, "W tym czasie urlop ma też" (approved only), success → notice and both close', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const { onClose, onDone } = show((p) => <ApproveModal request={requestItem()} {...p} />);
    expect(screen.getByText('Zatwierdzić wniosek?')).toBeInTheDocument();
    expect(await screen.findByText('W tym czasie urlop ma też: Tomasz Wójcik.')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Zatwierdź' });
    expect(confirm.getAttribute('style') ?? '').toContain('green');
    fireEvent.click(confirm);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-requests/21/approve'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Wniosek zatwierdzony. Jan Kowalski dostaje powiadomienie.'));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('approve: yellow frame for a past date', async () => {
    show((p) => <ApproveModal request={requestItem({ dateFrom: '2020-01-10', dateTo: '2020-01-10' })} {...p} />);
    expect(screen.getByText(/Termin tego wniosku już się zaczął albo minął/)).toBeInTheDocument();
  });

  it('reject: reason required under the field, nothing sent', async () => {
    const post = vi.spyOn(api, 'post');
    show((p) => <RejectModal request={requestItem()} {...p} />);
    expect(screen.getByText('2 zarezerwowane dni wrócą do puli pracownika.')).toBeInTheDocument();
    fireEvent.change(reasonField(), { target: { value: ' ab ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Odrzuć wniosek' }));
    expect(await screen.findByText('Wpisz powód (co najmniej 3 znaki). Pracownik zobaczy go w powiadomieniu.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('reject: sends the trimmed reason; server 400 shows the error under the field and keeps the window', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(apiError(400, { message: 'validation.invalid', fields: { reason: 'leave-requests.validation.reason_min' } }));
    const { onClose } = show((p) => <RejectModal request={requestItem()} {...p} />);
    fireEvent.change(reasonField(), { target: { value: ' Inwentaryzacja. ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Odrzuć wniosek' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-requests/21/reject', { reason: 'Inwentaryzacja.' }));
    expect(await screen.findByText('Wpisz powód (co najmniej 3 znaki). Pracownik zobaczy go w powiadomieniu.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancel: started leave shows a warning and the pool after cancelling; success closes', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const { onDone } = show((p) => <CancelModal request={requestItem({ status: 'approved', dateFrom: '2020-01-10', dateTo: '2020-01-13', poolLeft: { left: 19, total: 30 } })} {...p} />);
    expect(screen.getByText(/Ten urlop już się zaczął albo minął/)).toBeInTheDocument();
    expect(screen.getByText('2 dni wrócą do puli. Jan Kowalski będzie mieć wtedy do wykorzystania: 21.')).toBeInTheDocument();
    fireEvent.change(reasonField(), { target: { value: 'Pracował w tym czasie.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj urlop' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/leave-requests/21/cancel', { reason: 'Pracował w tym czasie.' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('cancel of a type that does not deduct: no sentence about days returning, also in the notice', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show((p) => <CancelModal request={requestItem({ status: 'approved', deductsPool: false, daysFromAnnual: 0 })} {...p} />);
    expect(screen.getByText('Ten typ urlopu nie odejmuje dni z puli, więc pula się nie zmieni.')).toBeInTheDocument();
    fireEvent.change(reasonField(), { target: { value: 'Ślub przełożony.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj urlop' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Urlop anulowany. Jan Kowalski dostaje powiadomienie z powodem.'));
  });

  it('409 already_decided: notice with who decided, window closes, details stay', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, { message: 'leave-requests.server.already_decided', current: 'approved', decidedByName: 'Marek Nowicki' }));
    const error = vi.spyOn(notify, 'error');
    const { onClose, onDone } = show((p) => <ApproveModal request={requestItem()} {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zatwierdź' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Ten wniosek rozpatrzył już Marek Nowicki. Lista jest odświeżona.'));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('409 already_decided for a withdrawn request: "Pracownik wycofał ten wniosek."', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, { message: 'leave-requests.server.already_decided', current: 'withdrawn', decidedByName: null }));
    const error = vi.spyOn(notify, 'error');
    show((p) => <RejectModal request={requestItem()} {...p} />);
    fireEvent.change(reasonField(), { target: { value: 'Inwentaryzacja.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Odrzuć wniosek' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Pracownik wycofał ten wniosek. Lista jest odświeżona.'));
  });

  it('other error: notice, modal stays open', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, { message: 'leave-requests.server.year_closed', year: 2025 }));
    const error = vi.spyOn(notify, 'error');
    const { onClose } = show((p) => <CancelModal request={requestItem({ status: 'approved' })} {...p} />);
    fireEvent.change(reasonField(), { target: { value: 'Przesunięty.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj urlop' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Rok 2025 jest już zamknięty, więc tego urlopu nie można anulować.'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
