import { useQueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { TaskComment } from '@app/shared';
import { api } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { renderWithProviders } from '../../../test/render';
import { TaskComments } from '../components/TaskComments';

const comment = (o: Partial<TaskComment> = {}): TaskComment => ({
  id: 3, authorId: 5, authorName: 'Jan Kowalski', authorArchived: false, text: 'Tonery zamówione', createdAt: '2026-11-12T08:30:00.000Z',
  editedAt: null, canEdit: true, canDelete: true, ...o,
});
const apiError = (status: number, message: string, fields?: Record<string, string>) =>
  Object.assign(new Error(String(status)), { isAxiosError: true, response: { status, data: { error: { message, ...(fields ? { fields } : {}) } } } });

/** Odświeżenie danych modułu (jak co 5 s albo po zapisie innej osoby). */
const Refresh = () => {
  const queryClient = useQueryClient();
  return <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}>odśwież</button>;
};
const show = (comments: TaskComment[]) => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: comments });
  renderWithProviders(<><Refresh /><TaskComments taskId={7} /></>);
  return get;
};
const field = () => screen.getByRole('textbox', { name: 'Napisz komentarz' });

afterEach(() => vi.restoreAllMocks());

describe('TaskComments', () => {
  it('empty list → „Nikt jeszcze nie skomentował tego zadania.”, count 0, add button disabled', async () => {
    const get = show([]);
    expect(await screen.findByText('Nikt jeszcze nie skomentował tego zadania.')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/tasks/7/comments');
    expect(screen.getByText('Komentarze')).toBeInTheDocument();
    expect(screen.getByText('Przypisane osoby dostaną powiadomienie.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj komentarz' })).toBeDisabled();
    fireEvent.change(field(), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Dodaj komentarz' })).toBeDisabled();
  });

  it('add → POST, field cleared, toast', async () => {
    show([]);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 12 } });
    const success = vi.spyOn(notify, 'success');
    await screen.findByText('Nikt jeszcze nie skomentował tego zadania.');
    fireEvent.change(field(), { target: { value: 'Tonery\nw piątek' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/tasks/7/comments', { text: 'Tonery\nw piątek' }));
    await waitFor(() => expect(field()).toHaveValue(''));
    expect(success).toHaveBeenCalledWith('Dodano komentarz.');
  });

  it('author, time, „(edytowany)” and buttons only when canEdit / canDelete', async () => {
    show([
      comment(),
      comment({ id: 4, authorId: 6, authorName: 'Piotr Zieliński', text: 'Dzięki', editedAt: '2026-11-12T09:00:00.000Z', canEdit: false, canDelete: false }),
    ]);
    const own = (await screen.findByText('Tonery zamówione')).closest('[data-comment]') as HTMLElement;
    const other = screen.getByText('Dzięki').closest('[data-comment]') as HTMLElement;
    expect(within(own).getByText('Jan Kowalski')).toBeInTheDocument();
    expect(within(own).getByText('12.11.2026 09:30')).toBeInTheDocument();
    expect(within(own).queryByText('(edytowany)')).not.toBeInTheDocument();
    expect(within(own).getByRole('button', { name: 'Edytuj' })).toBeInTheDocument();
    expect(within(own).getByRole('button', { name: 'Usuń' })).toBeInTheDocument();
    expect(within(other).getByText('(edytowany)')).toBeInTheDocument();
    expect(within(other).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('admin sees only „Usuń” on someone else’s comment; delete goes through the confirm window with the author name', async () => {
    show([comment({ authorId: 6, authorName: 'Piotr Zieliński', canEdit: false, canDelete: true })]);
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    await screen.findByText('Tonery zamówione');
    expect(screen.queryByRole('button', { name: 'Edytuj' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć komentarz?' });
    expect(within(dialog).getByText('Komentarz osoby Piotr Zieliński zniknie na stałe.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/tasks/comments/3'));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Usunięto komentarz.'));
  });

  it('edit: field with the text, save → PUT and toast; cancel brings the old text back', async () => {
    show([comment()]);
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ok: true } });
    const success = vi.spyOn(notify, 'success');
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj' }));
    const editor = screen.getByRole('textbox', { name: 'Popraw komentarz' });
    expect(editor).toHaveValue('Tonery zamówione');
    fireEvent.change(editor, { target: { value: 'Tonery będą w piątek' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/tasks/comments/3', { text: 'Tonery będą w piątek' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith('Zapisano komentarz.'));
    expect(screen.queryByRole('textbox', { name: 'Popraw komentarz' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Popraw komentarz' }), { target: { value: 'coś' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.queryByRole('textbox', { name: 'Popraw komentarz' })).not.toBeInTheDocument();
    expect(screen.getByText('Tonery zamówione')).toBeInTheDocument();
  });

  it('script shown as text, new lines kept', async () => {
    show([comment({ text: '<script>alert(1)</script>\ndruga linia' })]);
    const text = await screen.findByText(/<script>alert\(1\)<\/script>/);
    expect(text.textContent).toBe('<script>alert(1)</script>\ndruga linia');
    expect(text).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(document.querySelector('[data-comment] script')).toBeNull();
  });

  it('a refresh does not clear the draft or the open edit', async () => {
    const get = show([comment()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Popraw komentarz' }), { target: { value: 'Poprawiam' } });
    fireEvent.change(field(), { target: { value: 'Piszę nowy' } });
    get.mockResolvedValue({ data: [comment({ text: 'Tonery zamówione (ktoś inny)' }), comment({ id: 4, text: 'Nowy od kogoś' })] });
    fireEvent.click(screen.getByText('odśwież'));
    expect(await screen.findByText('Nowy od kogoś')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Popraw komentarz' })).toHaveValue('Poprawiam');
    expect(field()).toHaveValue('Piszę nowy');
  });

  it('a failed background refresh keeps the list and the open edit (error only when nothing loaded yet)', async () => {
    const get = show([comment()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Popraw komentarz' }), { target: { value: 'Poprawiam' } });
    get.mockRejectedValue(apiError(503, 'server.unavailable'));
    fireEvent.click(screen.getByText('odśwież'));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('textbox', { name: 'Popraw komentarz' })).toHaveValue('Poprawiam');
    expect(screen.queryByRole('button', { name: 'Spróbuj ponownie' })).not.toBeInTheDocument();
  });

  it('comment gone on save → toast „Nie znaleziono komentarza.”; too long → error under the field, text kept', async () => {
    show([comment()]);
    vi.spyOn(api, 'put').mockRejectedValue(apiError(404, 'tasks.comment_not_found'));
    const error = vi.spyOn(notify, 'error');
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Nie znaleziono komentarza.'));
    vi.spyOn(api, 'post').mockRejectedValue(apiError(400, 'server.invalid_data', { text: 'validation.too_long' }));
    fireEvent.change(field(), { target: { value: 'Za długi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj komentarz' }));
    expect(await screen.findByText('Za dużo znaków.')).toBeInTheDocument();
    expect(field()).toHaveValue('Za długi');
  });
});
