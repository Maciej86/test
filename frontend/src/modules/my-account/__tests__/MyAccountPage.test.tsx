import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { MyAccount } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { MyAccountPage } from '../MyAccountPage';

const jan: MyAccount = { name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', role: 'employee', email: 'jan@firma.pl', hiredOn: '2021-09-01', contractTypeName: 'Umowa o pracę' };
const anna: MyAccount = { ...jan, name: 'Anna Nowak', login: 'anna.nowak@firma.pl', role: 'admin', hiredOn: null, contractTypeName: null };

const show = (account: MyAccount) => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: account });
  renderWithProviders(<MyAccountPage />);
};
const serverError = (status: number, message: string, fields?: Record<string, string>) =>
  new AxiosError('x', String(status), undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { error: { message, fields } },
  });
const card = (title: string) => screen.getByRole('heading', { name: title }).closest('.mantine-Card-root') as HTMLElement;
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

afterEach(() => vi.restoreAllMocks());

describe('MyAccountPage', () => {
  it('shows own data from the server; employee hints', async () => {
    show(jan);
    expect(await screen.findByText('Jan Kowalski')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/my-account');
    const data = card('Moje dane');
    expect(within(data).getByText('jan.kowalski@firma.pl')).toBeInTheDocument();
    expect(within(data).getByText('Pracownik')).toBeInTheDocument();
    expect(within(data).getByText('01.09.2021')).toBeInTheDocument();
    expect(within(data).getByText('Umowa o pracę')).toBeInTheDocument();
    expect(screen.getByText('Te dane zmienia administrator. Coś się nie zgadza? Daj mu znać.')).toBeInTheDocument();
    expect(screen.getByText('Na razie aplikacja nie wysyła Ci e-maili; powiadomienia widzisz pod dzwonkiem.')).toBeInTheDocument();
    expect(screen.getByLabelText('Adres e-mail')).toHaveValue('jan@firma.pl');
  });

  it('admin hints; empty date and contract → "brak"', async () => {
    show(anna);
    await screen.findByText('Anna Nowak');
    expect(screen.getByText('Te dane zmienisz w Pracownikach.')).toBeInTheDocument();
    expect(screen.getByText('Na ten adres przychodzą e-maile o nowych wnioskach urlopowych.')).toBeInTheDocument();
    expect(within(card('Moje dane')).getAllByText('brak')).toHaveLength(2);
  });

  it('saves the e-mail and shows a notification; empty → null', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { email: null } });
    const success = vi.spyOn(notify, 'success');
    show(jan);
    await screen.findByText('Jan Kowalski');
    type('Adres e-mail', '');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz e-mail' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/my-account/email', { email: null }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Zapisano e-mail do powiadomień'));
  });

  it('bad format stays on the screen; 409 from the server → error under the e-mail field', async () => {
    const put = vi.spyOn(api, 'put').mockRejectedValue(serverError(409, 'validation.email_taken', { email: 'validation.email_taken' }));
    show(jan);
    await screen.findByText('Jan Kowalski');
    type('Adres e-mail', 'jan@');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz e-mail' }));
    expect(await screen.findByText('Podaj poprawny adres e-mail, np. jan.kowalski@firma.pl.')).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
    type('Adres e-mail', 'ewa@firma.pl');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz e-mail' }));
    expect(await screen.findByText('Ten e-mail ma już inne konto.')).toBeInTheDocument();
  });

  it('changes the password: notification, empty fields', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show(jan);
    await screen.findByText('Jan Kowalski');
    type(/^Obecne hasło/, 'Stare-haslo1');
    type(/^Nowe hasło/, 'Urlop2026!');
    type(/^Powtórz nowe hasło/, 'Urlop2026!');
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/my-account/password', { currentPassword: 'Stare-haslo1', newPassword: 'Urlop2026!', repeatPassword: 'Urlop2026!' }),
    );
    await waitFor(() => expect(success).toHaveBeenCalledWith('Hasło zmienione'));
    expect(screen.getByLabelText(/^Obecne hasło/)).toHaveValue('');
    expect(screen.getByLabelText(/^Nowe hasło/)).toHaveValue('');
  });

  it('server errors land under the password fields; 429 in a notification', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(serverError(400, 'server.invalid_data', { currentPassword: 'my-account.server.current_wrong' }));
    const error = vi.spyOn(notify, 'error');
    show(jan);
    await screen.findByText('Jan Kowalski');
    type(/^Obecne hasło/, 'zle-haslo1!');
    type(/^Nowe hasło/, 'Urlop2026!');
    type(/^Powtórz nowe hasło/, 'Urlop2026!');
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }));
    expect(await screen.findByText('Obecne hasło jest nieprawidłowe.')).toBeInTheDocument();
    post.mockRejectedValueOnce(serverError(429, 'server.too_many_password_tries'));
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Za dużo prób zmiany hasła. Spróbuj ponownie za 15 minut.'));
  });

  it('different repeat is caught before sending', async () => {
    const post = vi.spyOn(api, 'post');
    show(jan);
    await screen.findByText('Jan Kowalski');
    type(/^Obecne hasło/, 'Stare-haslo1');
    type(/^Nowe hasło/, 'Urlop2026!');
    type(/^Powtórz nowe hasło/, 'Urlop2025!');
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }));
    expect(await screen.findByText('Hasła się różnią. Wpisz to samo hasło dwa razy.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
