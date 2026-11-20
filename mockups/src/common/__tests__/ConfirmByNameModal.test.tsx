import { fireEvent, screen } from '@testing-library/react';
import { ConfirmByNameModal } from '../ConfirmByNameModal';
import { renderWithProviders } from '../../test/render';

const setup = () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <ConfirmByNameModal title="Usunąć na stałe?" confirmLabel="Usuń na stałe" name="Olga Testowa" inputLabel="Wpisz imię i nazwisko" onConfirm={onConfirm} onClose={onClose}>
      Treść pytania
    </ConfirmByNameModal>,
  );
  return { onConfirm, onClose };
};

describe('ConfirmByNameModal', () => {
  it('the confirm button works only after typing the exact name', () => {
    const { onConfirm } = setup();
    const button = screen.getByRole('button', { name: 'Usuń na stałe' });
    expect(screen.getByText('Treść pytania')).toBeInTheDocument();
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Wpisz imię i nazwisko'), { target: { value: 'olga testowa' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Wpisz imię i nazwisko'), { target: { value: '  Olga Testowa ' } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith('Olga Testowa');
  });

  it('cancel closes without confirming', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
