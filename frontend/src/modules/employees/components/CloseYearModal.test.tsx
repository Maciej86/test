import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { CloseYearPreview, EmployeeListItem } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { ArchiveModal } from './ArchiveModal';
import { CloseYearModal } from './CloseYearModal';
import { PasswordModal } from './PasswordModal';

const preview: CloseYearPreview = {
  year: 2026, nextYear: 2027, canClose: true, pendingRequests: 0,
  rows: [
    { userId: 2, name: 'Jan Kowalski', left: 21, annualDays: 26 },
    { userId: 3, name: 'Katarzyna Wiśniewska', left: 12, annualDays: 20 },
  ],
};
const jan: EmployeeListItem = {
  id: 2, name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', isMe: false, pool: null,
};

function serverError(status: number, message: string) {
  const config = { url: '/employees/close-year', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status, statusText: 'Error', headers: {}, config, data: { error: { message } },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('CloseYearModal, PasswordModal, ArchiveModal', () => {
  it('changing the next-year pool recalculates "Razem" (21 + 20 = 41) and sends the typed pools', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: preview });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const onClose = vi.fn();
    renderWithProviders(<CloseYearModal opened onClose={onClose} />);
    expect(await screen.findByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText('Pula na 2027')[0]!, { target: { value: '20' } });
    expect(await screen.findByText('41')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij rok 2026' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/employees/close-year', {
      year: 2026, pools: [{ userId: 2, annualDays: 20 }, { userId: 3, annualDays: 20 }],
    }));
    expect(success).toHaveBeenCalledWith('Zamknięto rok 2026. Pule na 2027 są gotowe.');
    expect(onClose).toHaveBeenCalled();
  });

  it('409 year_not_open → error notify and close', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: preview });
    vi.spyOn(api, 'post').mockRejectedValue(serverError(409, 'employees.server.year_not_open'));
    const error = vi.spyOn(notify, 'error');
    const onClose = vi.fn();
    renderWithProviders(<CloseYearModal opened onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Zamknij rok 2026' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Ten rok jest już zamknięty. Odśwież stronę.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('password modal sets a temporary password and notifies', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const onClose = vi.fn();
    renderWithProviders(<PasswordModal employee={jan} onClose={onClose} />);
    expect(screen.getByText(/Przy następnym logowaniu Jan Kowalski ustawi własne hasło/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ustaw hasło' }));
    expect(await screen.findByText('To pole jest wymagane.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wygeneruj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ustaw hasło' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/employees/2/password', { password: expect.stringMatching(/\d/) }));
    expect(success).toHaveBeenCalledWith('Ustawiono hasło tymczasowe.');
    expect(onClose).toHaveBeenCalled();
  });

  it('archive modal shows the name and notifies after archiving', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const onClose = vi.fn();
    renderWithProviders(<ArchiveModal employee={jan} onClose={onClose} />);
    expect(screen.getByText('Przenieść do archiwum: Jan Kowalski?')).toBeInTheDocument();
    expect(screen.getByText('Konto przestanie działać od razu, także jeśli ta osoba jest teraz zalogowana.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Do archiwum' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/employees/2/archive'));
    expect(success).toHaveBeenCalledWith('Przeniesiono do archiwum.');
    expect(onClose).toHaveBeenCalled();
  });
});
