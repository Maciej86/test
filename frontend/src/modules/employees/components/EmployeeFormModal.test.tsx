import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { EmployeeListItem } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { EmployeeFormModal } from './EmployeeFormModal';

const jan: EmployeeListItem = {
  id: 2, name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', isMe: false,
  pool: { year: 2026, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 0, leftDays: 21, leftCarriedDays: 0 },
};
const anna: EmployeeListItem = { ...jan, id: 1, name: 'Anna Nowak', login: 'anna.nowak@firma.pl', role: 'admin', isMe: true, pool: null };

function conflict(fields: Record<string, string>, archivedUser?: { id: number; name: string }) {
  const config = { url: '/employees', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status: 409, statusText: 'Conflict', headers: {}, config,
    data: { error: { message: Object.values(fields)[0], fields, archivedUser } },
  });
}

function show(employee: EmployeeListItem | null) {
  const onClose = vi.fn();
  renderWithProviders(<EmployeeFormModal opened employee={employee} year={2026} onClose={onClose} />);
  return { onClose };
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

afterEach(() => vi.restoreAllMocks());

describe('EmployeeFormModal', () => {
  it('empty form → "To pole jest wymagane."', async () => {
    const post = vi.spyOn(api, 'post');
    show(null);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect((await screen.findAllByText('To pole jest wymagane.')).length).toBeGreaterThanOrEqual(3);
    expect(post).not.toHaveBeenCalled();
  });

  it('role Administrator hides the pool section', async () => {
    show(anna);
    expect(screen.queryByText('Pula urlopu na 2026')).not.toBeInTheDocument();
  });

  it('employee shows the pool section with current values', () => {
    show(jan);
    expect(screen.getByText('Pula urlopu na 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Dni na rok', { exact: false })).toHaveValue('26');
    expect(screen.getByLabelText('Zaległe z 2025', { exact: false })).toHaveValue('4');
  });

  it('own role is disabled with a description', () => {
    show(anna);
    expect(screen.getByDisplayValue('Administrator')).toBeDisabled();
    expect(screen.getByText('Własnej roli nie zmienisz.')).toBeInTheDocument();
  });

  it('"Wygeneruj" fills a visible password that passes the rules', () => {
    show(null);
    fireEvent.click(screen.getByRole('button', { name: 'Wygeneruj' }));
    const input = screen.getByLabelText('Hasło tymczasowe', { exact: false }) as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toMatch(/\d/);
  });

  it('409 login_taken_archived → error under login with restore link; restore → notify', async () => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/employees') throw conflict({ login: 'employees.server.login_taken_archived' }, { id: 9, name: 'Ewa Mazur' });
      return { data: { ok: true } };
    });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(null);
    fill('Imię i nazwisko', 'Ewa Mazur');
    fill('Login', 'ewa.mazur@firma.pl');
    fill('Hasło tymczasowe', 'Urlop-2026');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText(/Ten login ma konto w archiwum: Ewa Mazur\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć konto zamiast zakładać nowe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Przywróć konto' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/employees/9/restore'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Przywrócono konto: Ewa Mazur.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('switching to Administrator with an empty pool field still saves', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    show(jan);
    fill('Dni na rok', '');
    fireEvent.click(screen.getByDisplayValue('Pracownik'));
    fireEvent.click(await screen.findByRole('option', { name: 'Administrator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/employees/2', expect.objectContaining({ role: 'admin' })));
  });

  it('edit dialog: archived login shows the error without the restore link', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(conflict({ login: 'employees.server.login_taken_archived' }, { id: 9, name: 'Ewa Mazur' }));
    show(jan);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText('Ten login ma konto w archiwum: Ewa Mazur.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Przywróć konto zamiast zakładać nowe' })).not.toBeInTheDocument();
  });

  it('409 login_taken → plain error under login', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(conflict({ login: 'validation.login_taken' }));
    show(jan);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText('Ten login jest już zajęty.')).toBeInTheDocument();
  });

  it('success → notify and close', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(jan);
    fill('Dni na rok', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/employees/2', expect.objectContaining({ annualDays: 20, carriedDays: 4, role: 'employee' })));
    expect(success).toHaveBeenCalledWith('Zapisano dane pracownika.');
    expect(onClose).toHaveBeenCalled();
  });
});
