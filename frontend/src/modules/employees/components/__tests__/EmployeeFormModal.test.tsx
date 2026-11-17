import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { EmployeeListItem } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { renderWithProviders } from '../../../../test/render';
import { EmployeeFormModal } from '../EmployeeFormModal';

const jan: EmployeeListItem = {
  id: 2, name: 'Jan Kowalski', firstName: 'Jan', lastName: 'Kowalski', login: 'jan.kowalski@firma.pl', email: null, role: 'employee', hiredOn: '2024-03-01', contractType: { id: 1, name: 'Umowa o pracę', hidden: false }, isMe: false,
  pool: { year: 2026, annualDays: 26, carriedDays: 4, usedDays: 9, pendingDays: 0, leftDays: 21, leftCarriedDays: 0 },
};
const anna: EmployeeListItem = { ...jan, id: 1, name: 'Anna Nowak', firstName: 'Anna', lastName: 'Nowak', login: 'anna.nowak@firma.pl', role: 'admin', isMe: true, pool: null };

const conflict = (fields: Record<string, string>, archivedUser?: { id: number; name: string }) => {
  const config = { url: '/employees', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status: 409, statusText: 'Conflict', headers: {}, config,
    data: { error: { message: Object.values(fields)[0], fields, archivedUser } },
  });
};

const show = (employee: EmployeeListItem | null) => {
  const onClose = vi.fn();
  renderWithProviders(<EmployeeFormModal opened employee={employee} year={2026} onClose={onClose} />);
  return { onClose };
};

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

const options = [{ id: 1, name: 'Umowa o pracę' }, { id: 2, name: 'Umowa zlecenie' }, { id: 4, name: 'B2B' }];
const mockOptions = (items = options) => vi.spyOn(api, 'get').mockResolvedValue({ data: { items } });
const contractField = () => screen.getByLabelText('Rodzaj umowy', { selector: 'input:not([type=hidden])' });

beforeEach(() => { mockOptions(); });
afterEach(() => vi.restoreAllMocks());

describe('EmployeeFormModal', () => {
  it('hire date and contract type are filled from the employee and sent as a number', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    show(jan);
    expect(screen.getByLabelText('Data zatrudnienia')).toHaveValue('01.03.2024');
    await waitFor(() => expect(contractField()).toHaveValue('Umowa o pracę'));
    fireEvent.change(screen.getByLabelText('Data zatrudnienia'), { target: { value: '15.04.2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/employees/2', expect.objectContaining({ hiredOn: '2025-04-15', contractTypeId: 1 })),
    );
  });

  it('new employee: hire date and contract type are optional and empty', () => {
    show(null);
    expect(screen.getByLabelText('Data zatrudnienia')).toHaveValue('');
    expect(contractField()).toHaveValue('');
  });

  it('empty form → "To pole jest wymagane."', async () => {
    const post = vi.spyOn(api, 'post');
    show(null);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect((await screen.findAllByText('To pole jest wymagane.')).length).toBeGreaterThanOrEqual(4);
    expect(post).not.toHaveBeenCalled();
  });

  it('first and last name are separate fields filled from the employee and sent separately', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    show(jan);
    expect(screen.getByLabelText('Imię', { exact: false })).toHaveValue('Jan');
    expect(screen.getByLabelText('Nazwisko', { exact: false })).toHaveValue('Kowalski');
    fill('Nazwisko', 'Nowak-Kowalska');
    fill('Imię', 'J');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText('Za mało znaków.')).toBeInTheDocument();
    fill('Imię', 'Joanna');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/employees/2', expect.objectContaining({ firstName: 'Joanna', lastName: 'Nowak-Kowalska' })));
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
    fill('Imię', 'Ewa');
    fill('Nazwisko', 'Mazur');
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

  it('restore fails → error notice, the restore window stays open to try again', async () => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/employees') throw conflict({ login: 'employees.server.login_taken_archived' }, { id: 9, name: 'Ewa Mazur' });
      throw new Error('network');
    });
    const error = vi.spyOn(notify, 'error');
    const { onClose } = show(null);
    fill('Imię', 'Ewa');
    fill('Nazwisko', 'Mazur');
    fill('Login', 'ewa.mazur@firma.pl');
    fill('Hasło tymczasowe', 'Urlop-2026');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Przywróć konto zamiast zakładać nowe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Przywróć konto' }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Przywróć konto' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
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

describe('contract type field', () => {
  /** Opcje z listy tego pola (Mantine trzyma listy wszystkich pól w dokumencie, więc szukamy po aria-controls). */
  const optionNames = async () => {
    // Najpierw odpowiedź z listą typów, potem otwarcie pola (jak u człowieka, który klika po załadowaniu okna).
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await vi.mocked(api.get).mock.results[0]!.value;
    await act(async () => {});
    fireEvent.click(contractField());
    const options = await waitFor(() => {
      const listbox = document.getElementById(contractField().getAttribute('aria-controls') ?? '')!;
      const found = within(listbox).queryAllByRole('option', { hidden: true });
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    return options.map((o) => o.textContent);
  };

  it('options in the order from the API, from the employees route', async () => {
    show(null);
    expect(await optionNames()).toEqual(['Umowa o pracę', 'Umowa zlecenie', 'B2B']);
    expect(api.get).toHaveBeenCalledWith('/employees/contract-types');
  });

  it('own hidden type is selected with "(ukryty)" at the end; another person does not see it', async () => {
    show({ ...jan, contractType: { id: 5, name: 'Umowa o staż', hidden: true } });
    await waitFor(() => expect(contractField()).toHaveValue('Umowa o staż (ukryty)'));
    expect(await optionNames()).toEqual(['Umowa o pracę', 'Umowa zlecenie', 'B2B', 'Umowa o staż (ukryty)']);
  });

  it('own hidden type still in a not yet refreshed options list → shown once, no crash', async () => {
    mockOptions([...options, { id: 5, name: 'Umowa o staż' }]);
    show({ ...jan, contractType: { id: 5, name: 'Umowa o staż', hidden: true } });
    expect(await optionNames()).toEqual(['Umowa o pracę', 'Umowa zlecenie', 'B2B', 'Umowa o staż']);
  });

  it('a person with a visible type gets no "(ukryty)" option', async () => {
    show(jan);
    const names = await optionNames();
    expect(names).toEqual(['Umowa o pracę', 'Umowa zlecenie', 'B2B']);
    expect(names.some((n) => n?.includes('(ukryty)'))).toBe(false);
  });

  it('contract types failed to load → message under the field', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('down'));
    show(jan);
    expect(await screen.findByText('Nie udało się wczytać typów umów. Odśwież stronę.')).toBeInTheDocument();
  });

  it('no visible types → text pointing to Settings', async () => {
    mockOptions([]);
    show(null);
    fireEvent.click(contractField());
    expect(await screen.findByText('Brak typów umów. Dodasz je w Ustawieniach → Typy umów.')).toBeInTheDocument();
  });

  it('clearing sends an empty contract', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    show(jan);
    await waitFor(() => expect(contractField()).toHaveValue('Umowa o pracę'));
    fireEvent.click(screen.getByLabelText('Wyczyść', { selector: 'button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/employees/2', expect.objectContaining({ contractTypeId: null })));
  });

  it('400 contract_type_unavailable → error under the field', async () => {
    const config = { url: '/employees/2', headers: new AxiosHeaders() };
    const key = 'employees.server.contract_type_unavailable';
    vi.spyOn(api, 'put').mockRejectedValue(new AxiosError('fail', 'ERR', config, undefined, {
      status: 400, statusText: 'Bad Request', headers: {}, config, data: { error: { message: key, fields: { contractTypeId: key } } },
    }));
    show(jan);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText('Tego typu umowy nie można już wybrać. Odśwież stronę.')).toBeInTheDocument();
  });
});
