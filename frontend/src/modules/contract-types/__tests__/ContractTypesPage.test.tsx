import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ContractTypeItem } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { ContractTypesPage } from '../ContractTypesPage';

const type = (o: Partial<ContractTypeItem>): ContractTypeItem => ({ id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4, ...o });
const employment = type({});
const mandate = type({ id: 2, name: 'Umowa zlecenie', employeesCount: 1 });
const specificWork = type({ id: 3, name: 'Umowa o dzieło', employeesCount: 0 });
const b2b = type({ id: 4, name: 'B2B', employeesCount: 2 });
const internship = type({ id: 5, name: 'Umowa o staż', hidden: true, employeesCount: 1 });

const show = (items: ContractTypeItem[]) => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { items } });
  renderWithProviders(<ContractTypesPage />);
};
const rowOf = async (name: string) => within(await screen.findByRole('table')).getByText(name).closest('tr')!;

afterEach(() => vi.restoreAllMocks());

describe('ContractTypesPage', () => {
  it('summary with visible and hidden counts', async () => {
    show([employment, mandate, specificWork, b2b, internship]);
    expect(await screen.findByText('Do wyboru u pracownika: 4. Ukryte: 1.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/contract-types');
  });

  it('"Show hidden" is off on entry; on → hidden type with badge, hint, no arrows and "Restore"', async () => {
    show([employment, mandate, internship]);
    const table = await screen.findByRole('table');
    expect(within(table).queryByText('Umowa o staż')).not.toBeInTheDocument();
    const toggle = screen.getByLabelText('Pokaż ukryte (1)');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    const row = await rowOf('Umowa o staż');
    expect(within(row).getByText('ukryty')).toBeInTheDocument();
    expect(within(row).getByText('Nie da się go wybrać u pracownika')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Przesuń wyżej' })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Przywróć' })).toBeInTheDocument();
  });

  it('no "Show hidden" switch when nothing is hidden', async () => {
    show([employment, mandate]);
    await screen.findByRole('table');
    expect(screen.queryByText(/Pokaż ukryte/)).not.toBeInTheDocument();
  });

  it('arrows disabled at the edges and call move', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    show([employment, mandate, b2b]);
    expect(within(await rowOf('Umowa o pracę')).getByRole('button', { name: 'Przesuń wyżej' })).toBeDisabled();
    expect(within(await rowOf('B2B')).getByRole('button', { name: 'Przesuń niżej' })).toBeDisabled();
    fireEvent.click(within(await rowOf('Umowa zlecenie')).getByRole('button', { name: 'Przesuń wyżej' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/contract-types/2/move', { direction: 'up' }));
    fireEvent.click(within(await rowOf('Umowa zlecenie')).getByRole('button', { name: 'Przesuń niżej' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/contract-types/2/move', { direction: 'down' }));
  });

  it('employees column: "4 pracowników", "1 pracownik" and "nikt"', async () => {
    show([employment, mandate, specificWork]);
    expect(within(await rowOf('Umowa o pracę')).getByText('4 pracowników')).toBeInTheDocument();
    expect(within(await rowOf('Umowa zlecenie')).getByText('1 pracownik')).toBeInTheDocument();
    expect(within(await rowOf('Umowa o dzieło')).getByText('nikt')).toBeInTheDocument();
  });

  it('the only visible type can be hidden ("Hide" enabled)', async () => {
    show([employment]);
    expect(within(await rowOf('Umowa o pracę')).getByRole('button', { name: 'Ukryj' })).toBeEnabled();
  });

  it('"Hide" opens the window with the employees count → toast hidden_done', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show([employment, mandate]);
    fireEvent.click(within(await rowOf('Umowa o pracę')).getByRole('button', { name: 'Ukryj' }));
    expect(await screen.findByText('Ukryć typ „Umowa o pracę”?')).toBeInTheDocument();
    expect(screen.getByText(/4 pracowników z tą umową ją zachowa/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ukryj' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/contract-types/1/hide'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ ukryty'));
  });

  it('hide window for a type without employees has no sentence about employees', async () => {
    show([employment, specificWork]);
    fireEvent.click(within(await rowOf('Umowa o dzieło')).getByRole('button', { name: 'Ukryj' }));
    expect(await screen.findByText('Zniknie z listy do wyboru w oknie pracownika. Typ możesz później przywrócić.')).toBeInTheDocument();
  });

  it('"Restore" calls unhide → toast unhidden_done; blocked while pending', async () => {
    let resolve: (v: unknown) => void = () => {};
    const post = vi.spyOn(api, 'post').mockReturnValue(new Promise((r) => { resolve = r; }));
    const success = vi.spyOn(notify, 'success');
    show([employment, internship]);
    fireEvent.click(await screen.findByLabelText('Pokaż ukryte (1)'));
    const restore = within(await rowOf('Umowa o staż')).getByRole('button', { name: 'Przywróć' });
    fireEvent.click(restore);
    await waitFor(() => expect(restore).toBeDisabled());
    fireEvent.click(restore);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/contract-types/5/unhide');
    resolve({ data: { ok: true } });
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ jest znowu do wyboru u pracownika'));
  });

  it('all types hidden → hidden types are shown right away, so they can be restored', async () => {
    show([{ ...employment, hidden: true }, internship]);
    expect(await screen.findByText('Do wyboru u pracownika: 0. Ukryte: 2.')).toBeInTheDocument();
    expect(within(await rowOf('Umowa o staż')).getByRole('button', { name: 'Przywróć' })).toBeInTheDocument();
    expect(within(await rowOf('Umowa o pracę')).getByRole('button', { name: 'Przywróć' })).toBeInTheDocument();
  });

  it('empty list text with add button', async () => {
    show([]);
    expect(await screen.findByText('Nie ma jeszcze typów umów. Dodaj pierwszy, a potem wybierzesz go w oknie pracownika.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dodaj typ umowy' }).length).toBeGreaterThanOrEqual(1);
  });

  it('abuse: a name with HTML is shown as plain text', async () => {
    show([employment, type({ id: 9, name: '<script>alert(1)</script>' })]);
    expect(await rowOf('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('tbody script')).toBeNull();
  });

  it('server error → error state with retry', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('down'));
    renderWithProviders(<ContractTypesPage />);
    expect(await screen.findByRole('button', { name: /Spróbuj ponownie/ })).toBeInTheDocument();
  });
});
