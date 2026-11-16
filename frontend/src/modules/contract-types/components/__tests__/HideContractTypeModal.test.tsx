import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ContractTypeItem } from '@app/shared';
import { api } from '../../../../core/api/client';
import { notify } from '../../../../core/notify';
import { renderWithProviders } from '../../../../test/render';
import { HideContractTypeModal } from '../HideContractTypeModal';

const employment: ContractTypeItem = { id: 1, name: 'Umowa o pracę', hidden: false, employeesCount: 4 };

afterEach(() => vi.restoreAllMocks());

describe('HideContractTypeModal', () => {
  it('server error → error toast, the window stays open', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('fail'));
    const error = vi.spyOn(notify, 'error');
    const onClose = vi.fn();
    renderWithProviders(<HideContractTypeModal contractType={employment} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj' }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
