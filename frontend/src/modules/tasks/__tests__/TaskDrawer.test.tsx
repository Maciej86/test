import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { BoardResponse, BoardTask } from '@app/shared';
import { api } from '../../../core/api/client';
import { renderWithProviders } from '../../../test/render';
import { TaskDrawer } from '../components/TaskDrawer';

const task: BoardTask = {
  id: 7, title: 'Oferta dla hurtowni', description: null, dueDate: '2026-11-10', column: 'in_progress', position: 1, completedAt: null, finishedAt: null,
  createdByName: 'Anna Nowak', createdAt: '2026-11-05T09:00:00.000Z', assigneeIds: [5, 8], leaves: [],
};
const board: BoardResponse = {
  project: { id: 9, name: 'Marketing' },
  people: [
    { id: 5, name: 'Jan Kowalski', role: 'employee', archived: false, assignable: true },
    { id: 8, name: 'Ewa Mazur', role: 'employee', archived: true, assignable: false },
  ],
  tasks: [task],
  oldDoneCount: 0,
  leaves: [],
};

afterEach(() => vi.restoreAllMocks());

describe('TaskDrawer', () => {
  it('edits keep typed values after a board refresh; a past due date is fine', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    // Odświeżenie tablicy co 5 s podaje nowy obiekt zadania (np. ktoś inny zmienił tytuł).
    const Refreshing = () => {
      const [current, setCurrent] = useState(task);
      return (
        <>
          <button type="button" onClick={() => setCurrent({ ...task, title: 'Zmiana kogoś innego' })}>odśwież</button>
          <TaskDrawer projectId={9} board={{ ...board, tasks: [current] }} task={current} onClose={vi.fn()} onArchive={vi.fn()} />
        </>
      );
    };
    renderWithProviders(<Refreshing />);
    expect(await screen.findByText('Zadanie: Marketing')).toBeInTheDocument();
    expect(screen.getByText(/Dodane przez: Anna Nowak, 05\.11\.2026/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Oferta dla hurtowni w Lesznie' } });
    fireEvent.click(screen.getByText('odśwież'));
    expect(screen.getByRole('textbox', { name: /Tytuł/ })).toHaveValue('Oferta dla hurtowni w Lesznie');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/tasks/7', expect.objectContaining({ title: 'Oferta dla hurtowni w Lesznie', dueDate: '2026-11-10' })));
  });

  it('not assignable person stays assigned but disabled in the list', async () => {
    renderWithProviders(<TaskDrawer projectId={9} board={board} task={task} onClose={vi.fn()} onArchive={vi.fn()} />);
    expect(await screen.findByText('Ewa Mazur')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.mantine-MultiSelect-inputField') as HTMLElement);
    expect(screen.queryByRole('option', { name: /Ewa Mazur/ })).not.toBeInTheDocument();
  });

  it('delete calls onArchive with the task', async () => {
    const onArchive = vi.fn();
    renderWithProviders(<TaskDrawer projectId={9} board={board} task={task} onClose={vi.fn()} onArchive={onArchive} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Usuń' }));
    expect(onArchive).toHaveBeenCalledWith(task);
  });

  it('saving sends only the fields the person changed; the rest comes from the latest board (no lost update)', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const Refreshing = () => {
      const [current, setCurrent] = useState(task);
      return (
        <>
          <button type="button" onClick={() => setCurrent({ ...task, column: 'done', assigneeIds: [5] })}>ktoś przeniósł</button>
          <TaskDrawer projectId={9} board={{ ...board, tasks: [current] }} task={current} onClose={vi.fn()} onArchive={vi.fn()} />
        </>
      );
    };
    renderWithProviders(<Refreshing />);
    fireEvent.change(await screen.findByRole('textbox', { name: /Tytuł/ }), { target: { value: 'Poprawiony tytuł' } });
    fireEvent.click(screen.getByText('ktoś przeniósł'));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/tasks/7', expect.objectContaining({ title: 'Poprawiony tytuł', column: 'done', assigneeIds: [5] })));
  });

  it('the drawer has Oznacz jako zakończone', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } });
    renderWithProviders(<TaskDrawer projectId={9} board={board} task={task} onClose={vi.fn()} onArchive={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Oznacz jako zakończone' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/tasks/7/finish', { finished: true }));
  });
});
