import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Divider, Drawer, Group, Modal, MultiSelect, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { CalendarClock, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, formatRelativeDateTime } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateField } from '../../common/DateField';
import { notify } from '../../common/notify';
import { ARCHIVED_PEOPLE, COLUMNS, TODAY, assignable, leaveBeforeDue, type Column, type MockComment, type MockProject, type MockTask } from './data';

/** W makiecie „teraz” = 18.11.2026, 9:30 (żeby „dzisiaj, 08:12” zgadzało się z danymi). */
const MOCK_NOW = new Date('2026-11-18T08:30:00Z');

/** Szerokość podglądu zadania z prawej: 440 px (rozmiar `md`) + 100 px. */
const DRAWER_WIDTH = 540;

const shortRange = (from: string, to: string) => ({ from: formatDate(from)?.slice(0, 5), to: formatDate(to) });

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

interface FormValues {
  title: string;
  description: string;
  due: string | null;
  people: string[];
  column: Column;
}

/** Pola zadania: te same w oknie „Dodaj zadanie” i w podglądzie z prawej. */
const TaskFields = ({ project, values, onChange, isNew, showErrors }: {
  project: MockProject;
  values: FormValues;
  onChange: (v: FormValues) => void;
  isNew: boolean;
  showErrors: boolean;
}) => {
  const { t } = useTranslation('tasks');
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => onChange({ ...values, [key]: value });
  // Osoby spoza projektu albo z archiwum zostają przy starym zadaniu, ale nie da się ich dodać.
  const options = [...assignable(project), ...values.people.filter((p) => !assignable(project).includes(p))];
  const onLeave = values.people.map((p) => ({ p, leave: leaveBeforeDue(values, p) })).filter((x) => x.leave);

  return (
    <Stack>
      <TextInput
        label={t('field_title')}
        description={t('field_title_hint')}
        value={values.title}
        onChange={(e) => set('title', e.currentTarget.value)}
        error={showErrors && t('error_title')}
        required
        data-autofocus
      />
      <Textarea label={t('field_description')} value={values.description} onChange={(e) => set('description', e.currentTarget.value)} autosize minRows={3} maxRows={10} />
      <Group grow align="flex-start">
        <DateField label={t('field_due')} value={values.due} onChange={(v) => set('due', v)} minDate={isNew ? TODAY : undefined} error={showErrors && t('error_due_past')} />
        <Select
          label={t('field_column')}
          data={COLUMNS.map((c) => ({ value: c, label: t(`column.${c}`) }))}
          value={values.column}
          onChange={(v) => v && set('column', v as Column)}
          allowDeselect={false}
        />
      </Group>
      <MultiSelect
        label={t('field_people')}
        description={t('field_people_hint', { project: project.name })}
        placeholder={values.people.length === 0 ? t('field_people_placeholder') : undefined}
        data={options.map((p) => ({ value: p, label: p, disabled: !assignable(project).includes(p) }))}
        value={values.people}
        onChange={(v) => set('people', v)}
        searchable
        hidePickedOptions
        renderOption={({ option }) => {
          const leave = leaveBeforeDue(values, option.value);
          return (
            <Stack gap={0}>
              <Text size="sm">{option.label}</Text>
              {ARCHIVED_PEOPLE.includes(option.value) && <Text size="xs" c="dimmed">{t('option_archived')}</Text>}
              {leave && <Text size="xs" c="yellow.4">{t('option_on_leave', shortRange(leave.from, leave.to))}</Text>}
            </Stack>
          );
        }}
      />
      {onLeave.length > 0 && (
        <Alert variant="light" color="yellow" icon={<CalendarClock size={18} />} title={t('leave_warning_title')}>
          <Stack gap={2}>
            {onLeave.map(({ p, leave }) => (
              <Text key={p} size="sm">{t('leave_warning', { name: p, ...shortRange(leave!.from, leave!.to) })}</Text>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
};

const valuesOf = (task: MockTask | null, showErrors: boolean): FormValues => ({
  title: showErrors ? 'Ab' : task?.title ?? '',
  description: task?.description ?? '',
  due: showErrors ? '2026-11-12' : task?.due ?? null,
  people: task?.people ?? [],
  column: task?.column ?? 'draft',
});

/** Nowe zadanie: okno na środku ekranu. */
export const TaskCreateModal = ({ project, showErrors = false, onClose }: { project: MockProject; showErrors?: boolean; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const [values, setValues] = useState(valuesOf(null, showErrors));
  return (
    <Modal opened onClose={onClose} title={t('new_task_in', { project: project.name })} size="lg">
      <Stack>
        <TaskFields project={project} values={values} onChange={setValues} isNew showErrors={showErrors} />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="add" />} onClick={() => { notify.success(t('added')); onClose(); }}>{t('add')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

const CommentItem = ({ comment, me, isAdmin, onDelete }: { comment: MockComment; me: string; isAdmin: boolean; onDelete: () => void }) => {
  const { t } = useTranslation('tasks');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const own = comment.author === me;
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <Avatar size="sm" radius="xl" color="navy" variant="light">{initials(comment.author)}</Avatar>
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="wrap">
          <Text size="sm" fw={600}>{comment.author}</Text>
          <Text size="xs" c="dimmed">{formatRelativeDateTime(comment.createdAt.replace(' ', 'T') + ':00Z', t, MOCK_NOW)}</Text>
          {comment.edited && <Text size="xs" c="dimmed">{t('comment_edited')}</Text>}
        </Group>
        {editing ? (
          <Stack gap="xs">
            <Textarea value={text} onChange={(e) => setText(e.currentTarget.value)} autosize minRows={2} aria-label={t('comment_edit')} />
            <Group gap="xs" justify="flex-end">
              <Button size="xs" variant="default" leftSection={<ButtonIcon action="cancel" size={14} />} onClick={() => { setText(comment.text); setEditing(false); }}>{t('cancel')}</Button>
              <Button size="xs" leftSection={<ButtonIcon action="save" size={14} />} onClick={() => { setEditing(false); notify.success(t('comment_saved')); }}>{t('save')}</Button>
            </Group>
          </Stack>
        ) : (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
        )}
        {!editing && (own || isAdmin) && (
          <Group gap={4}>
            {own && <Button size="compact-xs" variant="subtle" color="gray" leftSection={<ButtonIcon action="edit" size={12} />} onClick={() => setEditing(true)}>{t('edit')}</Button>}
            <Button size="compact-xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={12} />} onClick={onDelete}>{t('delete')}</Button>
          </Group>
        )}
      </Stack>
    </Group>
  );
};

const Comments = ({ task, me, isAdmin }: { task: MockTask; me: string; isAdmin: boolean }) => {
  const { t } = useTranslation('tasks');
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<MockComment | null>(null);
  const comments = task.comments ?? [];
  return (
    <Stack gap="md">
      <Group gap="xs">
        <MessageSquare size={18} />
        <Title order={4}>{t('comments')}</Title>
        <Badge variant="light" color="gray" tt="none">{comments.length}</Badge>
      </Group>
      {comments.length === 0 && <Text size="sm" c="dimmed">{t('comments_empty')}</Text>}
      {comments.map((c) => <CommentItem key={c.id} comment={c} me={me} isAdmin={isAdmin} onDelete={() => setToDelete(c)} />)}
      <Stack gap="xs">
        <Textarea
          placeholder={t('comment_placeholder')}
          aria-label={t('comment_placeholder')}
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={8}
        />
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">{t('comment_notify_hint')}</Text>
          <Button size="xs" leftSection={<ButtonIcon action="send" size={14} />} disabled={draft.trim() === ''} onClick={() => { setDraft(''); notify.success(t('comment_added')); }}>
            {t('comment_add')}
          </Button>
        </Group>
      </Stack>
      {toDelete && (
        <ConfirmModal title={t('comment_delete_title')} confirmLabel={t('delete')} confirmAction="delete" danger onConfirm={() => { setToDelete(null); notify.success(t('comment_deleted')); }} onClose={() => setToDelete(null)}>
          <Text>{t('comment_delete_text', { name: toDelete.author })}</Text>
        </ConfirmModal>
      )}
    </Stack>
  );
};

/** Podgląd i zmiana klikniętej karty: szuflada z prawej, pod formularzem komentarze. */
export const TaskDrawer = ({ project, task, me, isAdmin, onClose, onArchive }: {
  project: MockProject;
  task: MockTask;
  me: string;
  isAdmin: boolean;
  onClose: () => void;
  onArchive: (task: MockTask) => void;
}) => {
  const { t } = useTranslation('tasks');
  const [values, setValues] = useState(valuesOf(task, false));
  return (
    <Drawer
      opened
      onClose={onClose}
      position="right"
      size={DRAWER_WIDTH}
      title={<Text ff="heading" fw={600} size="lg">{t('task_in', { project: project.name })}</Text>}
    >
      <Stack>
        <TaskFields project={project} values={values} onChange={setValues} isNew={false} showErrors={false} />
        <Stack gap={2}>
          <Text size="xs" c="dimmed">{t('created_by', { name: task.createdBy, date: formatDateTime(task.createdAt) })}</Text>
          {task.completedAt && <Text size="xs" c="dimmed">{t('completed_at', { date: formatDateTime(task.completedAt) })}</Text>}
        </Stack>
        <Group justify="space-between">
          <Button variant="subtle" color="red" leftSection={<ButtonIcon action="delete" />} onClick={() => onArchive(task)}>{t('delete')}</Button>
          <Group gap="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button leftSection={<ButtonIcon action="save" />} onClick={() => { notify.success(t('saved')); onClose(); }}>{t('save')}</Button>
          </Group>
        </Group>
        <Divider my="xs" />
        <Comments task={task} me={me} isAdmin={isAdmin} />
      </Stack>
    </Drawer>
  );
};

export const ArchiveTaskModal = ({ task, onClose }: { task: MockTask; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  return (
    <ConfirmModal
      title={t('archive_title')}
      confirmLabel={t('archive_confirm')}
      confirmAction="delete"
      danger
      onConfirm={() => { notify.success(t('archived')); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('archive_text', { title: task.title, count: task.comments?.length ?? 0 })}</Text>
    </ConfirmModal>
  );
};
