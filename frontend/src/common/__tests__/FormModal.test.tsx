import { fireEvent, screen } from '@testing-library/react';
import { FormModal } from '../FormModal';
import { renderWithProviders } from '../../test/render';

const setup = (props: Partial<Parameters<typeof FormModal>[0]> = {}) => {
  const onSubmit = vi.fn((e?: React.FormEvent<HTMLFormElement>) => e?.preventDefault());
  const onClose = vi.fn();
  renderWithProviders(
    <FormModal title="Nowy typ" submitLabel="Zapisz" submitAction="save" onSubmit={onSubmit} onClose={onClose} {...props}>
      <input aria-label="Nazwa" />
    </FormModal>,
  );
  return { onSubmit, onClose };
};

describe('FormModal', () => {
  it('shows the title, fields and both buttons', () => {
    setup();
    expect(screen.getByText('Nowy typ')).toBeInTheDocument();
    expect(screen.getByLabelText('Nazwa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz' })).toHaveAttribute('type', 'submit');
  });

  it('submit sends the form, cancel calls onClose', () => {
    const { onSubmit, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submitDisabled turns the submit button off', () => {
    setup({ submitDisabled: true });
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
  });

  it('opened={false} hides the window', () => {
    setup({ opened: false });
    expect(screen.queryByText('Nowy typ')).not.toBeInTheDocument();
  });
});
