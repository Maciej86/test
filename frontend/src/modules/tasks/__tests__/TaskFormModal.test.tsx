import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { BoardResponse } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { TaskFormModal } from '../components/TaskFormModal';

const board: BoardResponse = {
  project: { id: 9, name: 'Marketing' },
  people: [
    { id: 5, name: 'Jan Kowalski', role: 'employee', archived: false, assignable: true },
    { id: 6, name: 'Piotr Zieliński', role: 'employee', archived: false, assignable: true },
  ],
  tasks: [],
  oldDoneCount: 0,
  leaves: [{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }],
};
const show = () => {
  const onClose = vi.fn();
  renderWithProviders(<TaskFormModal projectId={9} board={board} onClose={onClose} />);
  return onClose;
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Dodaj zadanie' }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TaskFormModal', () => {
  it('title too short shows an error under the field', async () => {
    const post = vi.spyOn(api, 'post');
    show();
    expect(screen.getByText('Nowe zadanie: Marketing')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Ab' } });
    save();
    expect(await screen.findByText('Za mało znaków.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('due date yesterday cannot be chosen (the calendar starts today; the server checks it too)', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 40 } });
    show();
    fireEvent.change(screen.getByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Zamówić ulotki' } });
    const due = screen.getByRole('textbox', { name: 'Termin (nieobowiązkowy)' });
    fireEvent.change(due, { target: { value: '17.11.2026' } });
    fireEvent.blur(due);
    save();
    await waitFor(() => expect(post).toHaveBeenCalledWith('/tasks/projects/9/tasks', expect.objectContaining({ dueDate: null })));
  });

  it('leave warning with dates for a chosen person on leave before the due date', async () => {
    show();
    fireEvent.click(document.querySelector('.mantine-MultiSelect-inputField') as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: /Piotr Zieliński/ }));
    expect(await screen.findByText('Urlop przed terminem')).toBeInTheDocument();
    expect(screen.getByText('Piotr Zieliński ma urlop 23.11–27.11.2026, czyli przed terminem tego zadania.')).toBeInTheDocument();
  });

  it('saves, shows the message and closes', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 40 } });
    const success = vi.spyOn(notify, 'success');
    const onClose = show();
    fireEvent.change(screen.getByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Zamówić ulotki' } });
    save();
    await waitFor(() => expect(post).toHaveBeenCalledWith('/tasks/projects/9/tasks', expect.objectContaining({ title: 'Zamówić ulotki', column: 'draft', assigneeIds: [] })));
    expect(success).toHaveBeenCalledWith('Dodano zadanie. Przypisane osoby dostaną powiadomienie.');
    expect(onClose).toHaveBeenCalled();
  });

  it('server field error goes under the field', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(Object.assign(new Error('400'), {
      isAxiosError: true,
      response: { status: 400, data: { error: { message: 'server.invalid_data', fields: { assigneeIds: 'tasks.assignee_not_allowed' } } } },
    }));
    show();
    fireEvent.change(screen.getByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Zamówić ulotki' } });
    save();
    expect(await screen.findByText('Tej osoby nie można przypisać: nie należy do projektu albo jej konto jest w archiwum.')).toBeInTheDocument();
  });
});
