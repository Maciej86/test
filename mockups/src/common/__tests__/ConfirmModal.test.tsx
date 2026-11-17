import { fireEvent, screen } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';
import { renderWithProviders } from '../../test/render';

const setup = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <ConfirmModal title="Ukryć typ?" confirmLabel="Ukryj" confirmAction="hide" onConfirm={onConfirm} onClose={onClose} {...props}>
      Treść pytania
    </ConfirmModal>,
  );
  return { onConfirm, onClose };
};

describe('ConfirmModal', () => {
  it('shows the title, content and both buttons', () => {
    setup();
    expect(screen.getByText('Ukryć typ?')).toBeInTheDocument();
    expect(screen.getByText('Treść pytania')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ukryj' })).toBeInTheDocument();
  });

  it('confirm calls onConfirm, cancel calls onClose', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancelLabel replaces "Anuluj" (e.g. "Zostaw"), still closes', () => {
    const { onClose } = setup({ cancelLabel: 'Zostaw' });
    expect(screen.queryByRole('button', { name: 'Anuluj' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zostaw' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('danger makes the confirm button red', () => {
    setup({ danger: true });
    expect(screen.getByRole('button', { name: 'Ukryj' }).getAttribute('style') ?? '').toContain('red');
  });

  it('loading blocks the confirm button', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: 'Ukryj' })).toHaveAttribute('data-loading', 'true');
  });
});
