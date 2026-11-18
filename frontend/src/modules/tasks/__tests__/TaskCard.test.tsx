import { screen } from '@testing-library/react';
import type { BoardPerson, BoardTask } from '@app/shared';
import { TaskCard } from '../components/TaskCard';
import { renderWithProviders } from '../../../test/render';

const person = (id: number, name: string, o: Partial<BoardPerson> = {}): BoardPerson => ({ id, name, role: 'employee', archived: false, assignable: true, ...o });
const people = new Map(
  [person(1, 'Anna Nowak'), person(5, 'Jan Kowalski'), person(6, 'Piotr Zieliński'), person(7, 'Tomasz Wójcik'), person(8, 'Ewa Mazur', { archived: true, assignable: false })].map((p) => [p.id, p]),
);
const task = (o: Partial<BoardTask> = {}): BoardTask => ({
  id: 7, title: 'Oferta dla hurtowni', description: 'Cennik na 2027.', dueDate: null, column: 'in_progress', position: 1, completedAt: null,
  createdByName: 'Anna Nowak', createdAt: '2026-11-05T10:00:00.000Z', assigneeIds: [], leaves: [], ...o,
});
const show = (t: BoardTask, meId = 5) =>
  renderWithProviders(<TaskCard task={t} people={people} meId={meId} onOpen={vi.fn()} onMove={vi.fn()} onArchive={vi.fn()} />);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('TaskCard', () => {
  it('due date red when overdue, yellow today and tomorrow, plain later', () => {
    const { unmount } = show(task({ dueDate: '2026-11-10' }));
    expect(screen.getByText('10.11.2026').closest('[data-due]')).toHaveAttribute('data-due', 'overdue');
    unmount();
    const soon = show(task({ dueDate: '2026-11-19' }));
    expect(screen.getByText('19.11.2026').closest('[data-due]')).toHaveAttribute('data-due', 'soon');
    soon.unmount();
    show(task({ dueDate: '2026-11-25' }));
    expect(screen.getByText('25.11.2026').closest('[data-due]')).toHaveAttribute('data-due', 'normal');
  });

  it('done card shows completion date, no description', () => {
    show(task({ column: 'done', completedAt: '2026-11-14T15:10:00.000Z', dueDate: '2026-11-10' }));
    expect(screen.getByText('Zrealizowane 14.11.2026')).toBeInTheDocument();
    expect(screen.queryByText('Cennik na 2027.')).not.toBeInTheDocument();
    expect(screen.queryByText('10.11.2026')).not.toBeInTheDocument();
  });

  it('more than 3 people shows +N; nobody shows the text', () => {
    const { unmount } = show(task({ assigneeIds: [1, 5, 6, 7] }));
    expect(screen.getByText('+1')).toBeInTheDocument();
    unmount();
    show(task());
    expect(screen.getByText('Nikt nie jest przypisany')).toBeInTheDocument();
  });

  it('archived person grey, leave dot with dates', () => {
    show(task({ dueDate: '2026-11-25', assigneeIds: [6, 8], leaves: [{ userId: 6, dateFrom: '2026-11-23', dateTo: '2026-11-27' }] }));
    expect(screen.getByLabelText('Piotr Zieliński: urlop 23.11–27.11.2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Ewa Mazur (konto w archiwum)')).toBeInTheDocument();
  });

  it('my task has the side bar', () => {
    const { container, unmount } = show(task({ assigneeIds: [5] }));
    expect(container.querySelector('[data-mine="true"]')).not.toBeNull();
    unmount();
    const other = show(task({ assigneeIds: [6] }));
    expect(other.container.querySelector('[data-mine="true"]')).toBeNull();
  });
});
