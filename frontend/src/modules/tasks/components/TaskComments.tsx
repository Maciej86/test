import { useState } from 'react';
import { Badge, Button, Group, Stack, Text, Textarea, Title, Tooltip } from '@mantine/core';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { commentSchema, formatDateTime, formatRelativeDateTime, type TaskComment } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { DataState } from '../../../common/DataState';
import { PersonAvatar } from '../../../common/PersonAvatar';
import { apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useAddComment, useDeleteComment, useEditComment, useTaskComments } from '../tasks.api';

const COMMENT_ROWS_MAX = 8;

/**
 * Pole tekstu komentarza z błędem: najpierw schemat (jak na serwerze), potem błąd pola z odpowiedzi serwera.
 * Przy błędzie tekst zostaje w polu.
 */
const useCommentText = (initial: string) => {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const change = (value: string) => {
    setText(value);
    setError(undefined);
  };
  /** Sprawdzony tekst do wysłania albo null (błąd pokazany pod polem). */
  const checked = (): string | null => {
    const result = commentSchema.safeParse({ text });
    if (result.success) return result.data.text;
    setError(result.error.issues[0]?.message);
    return null;
  };
  /** Błąd z serwera: pole `text` pod polem, inny jako dymek. */
  const failed = (err: unknown, t: Parameters<typeof apiErrorMessage>[1]) => {
    const fields = apiErrorFields(err);
    if (fields?.text) setError(fields.text);
    else notify.error(apiErrorMessage(err, t));
  };
  return { text, setText: change, error, checked, failed };
};

const CommentItem = ({ comment, onDelete }: { comment: TaskComment; onDelete: (c: TaskComment) => void }) => {
  const { t } = useTranslation('tasks');
  const [editing, setEditing] = useState(false);
  const draft = useCommentText(comment.text);
  const edit = useEditComment();
  // Autor w archiwum albo usunięty na stałe: szare kółko (jak przy przypisanych osobach).
  const gone = comment.authorArchived || comment.authorId === null;
  const startEdit = () => {
    draft.setText(comment.text);
    setEditing(true);
  };
  const save = () => {
    const text = draft.checked();
    if (text === null) return;
    edit.mutate(
      { id: comment.id, text },
      {
        onSuccess: () => {
          notify.success(t('comment_saved'));
          setEditing(false);
        },
        onError: (err) => draft.failed(err, t),
      },
    );
  };
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap" data-comment={comment.id}>
      <PersonAvatar name={comment.authorName} archived={gone} />
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="wrap">
          <Text size="sm" fw={600}>{comment.authorName}</Text>
          <Tooltip label={formatDateTime(comment.createdAt)} withArrow>
            <Text size="xs" c="dimmed">{formatRelativeDateTime(comment.createdAt, t)}</Text>
          </Tooltip>
          {comment.editedAt && <Text size="xs" c="dimmed">{t('comment_edited')}</Text>}
        </Group>
        {editing ? (
          <Stack gap="xs">
            <Textarea
              value={draft.text}
              onChange={(e) => draft.setText(e.currentTarget.value)}
              error={fieldError(t, draft.error)}
              autosize
              minRows={2}
              maxRows={COMMENT_ROWS_MAX}
              aria-label={t('comment_edit')}
            />
            <Group gap="xs" justify="flex-end">
              <Button size="xs" variant="default" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={() => setEditing(false)}>{t('cancel')}</Button>
              <Button size="xs" leftSection={<ButtonIcon action="save" size={14} />} loading={edit.isPending} onClick={save}>{t('save')}</Button>
            </Group>
          </Stack>
        ) : (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.text}</Text>
        )}
        {!editing && (comment.canEdit || comment.canDelete) && (
          <Group gap={4}>
            {comment.canEdit && (
              <Button size="compact-xs" variant="subtle" color="gray" leftSection={<ButtonIcon action="edit" size={12} />} onClick={startEdit}>{t('edit')}</Button>
            )}
            {comment.canDelete && (
              <Button size="compact-xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={12} />} onClick={() => onDelete(comment)}>{t('delete')}</Button>
            )}
          </Group>
        )}
      </Stack>
    </Group>
  );
};

/**
 * Komentarze w podglądzie zadania (część 2): lista od najstarszego, pole do pisania na dole. Zapisują się osobno od
 * pól zadania; odświeżanie co 5 s nie czyści pisanego tekstu ani otwartej poprawki (stan pól jest tutaj, nie w danych).
 */
export const TaskComments = ({ taskId }: { taskId: number }) => {
  const { t } = useTranslation('tasks');
  const comments = useTaskComments(taskId);
  const add = useAddComment(taskId);
  const remove = useDeleteComment();
  const draft = useCommentText('');
  const [toDelete, setToDelete] = useState<TaskComment | null>(null);
  const list = comments.data ?? [];
  // Nieudane odświeżenie w tle zostawia ostatnią listę (i otwartą poprawkę); błąd tylko, gdy nic jeszcze nie ma.
  const loadState = { ...comments, isError: comments.isError && comments.data === undefined };

  const submit = () => {
    const text = draft.checked();
    if (text === null) return;
    add.mutate(
      { text },
      {
        onSuccess: () => {
          draft.setText('');
          notify.success(t('comment_added'));
        },
        onError: (err) => draft.failed(err, t),
      },
    );
  };
  const confirmDelete = () => {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => notify.success(t('comment_deleted')),
      onError: (err) => notify.error(apiErrorMessage(err, t)),
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <Stack gap="md">
      <Group gap="xs">
        <MessageSquare size={18} />
        <Title order={4}>{t('comments')}</Title>
        {comments.data && <Badge variant="light" color="gray" tt="none">{list.length}</Badge>}
      </Group>
      <DataState query={loadState}>
        {list.length === 0 && <Text size="sm" c="dimmed">{t('comments_empty')}</Text>}
        {list.map((c) => <CommentItem key={c.id} comment={c} onDelete={setToDelete} />)}
      </DataState>
      <Stack gap="xs">
        <Textarea
          placeholder={t('comment_placeholder')}
          aria-label={t('comment_placeholder')}
          value={draft.text}
          onChange={(e) => draft.setText(e.currentTarget.value)}
          error={fieldError(t, draft.error)}
          autosize
          minRows={2}
          maxRows={COMMENT_ROWS_MAX}
        />
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">{t('comment_notify_hint')}</Text>
          <Button size="xs" leftSection={<ButtonIcon action="send" size={14} />} disabled={draft.text.trim() === ''} loading={add.isPending} onClick={submit}>
            {t('comment_add')}
          </Button>
        </Group>
      </Stack>
      {toDelete && (
        <ConfirmModal
          title={t('comment_delete_title')}
          confirmLabel={t('delete')}
          confirmAction="delete"
          danger
          loading={remove.isPending}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        >
          <Text>{t('comment_delete_text', { name: toDelete.authorName })}</Text>
        </ConfirmModal>
      )}
    </Stack>
  );
};
