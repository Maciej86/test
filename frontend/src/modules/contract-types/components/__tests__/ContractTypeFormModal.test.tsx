import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ContractTypeItem } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { renderWithProviders } from '../../../../test/render';
import { ContractTypeFormModal } from '../ContractTypeFormModal';

const employment: ContractTypeItem = { id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 };

const conflict = (message: string, hiddenType?: { id: number; name: string }) => {
  const config = { url: '/contract-types', headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    status: 409, statusText: 'Conflict', headers: {}, config,
    data: { error: { message, fields: { name: message }, hiddenType } },
  });
};

const show = (contractType: ContractTypeItem | null) => {
  const onClose = vi.fn();
  renderWithProviders(<ContractTypeFormModal contractType={contractType} onClose={onClose} />);
  return { onClose };
};
const fillName = (value: string) => fireEvent.change(screen.getByLabelText('Nazwa', { exact: false }), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

afterEach(() => vi.restoreAllMocks());

describe('ContractTypeFormModal', () => {
  it('adding: empty name → required, nothing sent', async () => {
    const post = vi.spyOn(api, 'post');
    show(null);
    expect(screen.getByText('Dodaj typ umowy', { selector: 'h2' })).toBeInTheDocument();
    save();
    expect(await screen.findByText('To pole jest wymagane.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('adding: success → toast "Dodano typ umowy" and close', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 6 } });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(null);
    fillName('Umowa o staż');
    save();
    await waitFor(() => expect(post).toHaveBeenCalledWith('/contract-types', { name: 'Umowa o staż' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Dodano typ umowy'));
    expect(onClose).toHaveBeenCalled();
  });

  it('edit of a type with employees → yellow warning; save → toast', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    show(employment);
    expect(screen.getByText('Edytuj typ „Umowa o pracę”')).toBeInTheDocument();
    expect(screen.getByText('Ten typ ma 4 pracowników. Nowa nazwa pokaże się także u nich.')).toBeInTheDocument();
    fillName('Umowa o pracę na czas nieokreślony');
    save();
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/contract-types/1', { name: 'Umowa o pracę na czas nieokreślony' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Zapisano zmiany'));
  });

  it('edit of a type with 0 employees → no warning', () => {
    show({ ...employment, employeesCount: 0 });
    expect(screen.queryByText(/Ten typ ma/)).not.toBeInTheDocument();
  });

  it('409 name_taken → error under the field', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(conflict('contract-types.server.name_taken'));
    show(null);
    fillName('umowa zlecenie');
    save();
    expect(await screen.findByText('Typ o tej nazwie już jest.')).toBeInTheDocument();
  });

  it('409 name_taken_hidden → "Przywróć go" link restores, closes and shows toast', async () => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/contract-types') throw conflict('contract-types.server.name_taken_hidden', { id: 5, name: 'Umowa o staż' });
      return { data: { ok: true } };
    });
    const success = vi.spyOn(notify, 'success');
    const { onClose } = show(null);
    fillName('umowa o staż');
    save();
    expect(await screen.findByText(/Typ „Umowa o staż” już jest, ukryty./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć go' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/contract-types/5/unhide'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Typ jest znowu do wyboru u pracownika'));
    expect(onClose).toHaveBeenCalled();
  });

  it('other server error → error toast', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('down'));
    const error = vi.spyOn(notify, 'error');
    show(null);
    fillName('Umowa o staż');
    save();
    await waitFor(() => expect(error).toHaveBeenCalled());
  });
});
