import { useState } from 'react';
import { Alert, Button, Divider, Drawer, Group, MultiSelect, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateField } from '../../common/DateField';
import { notify } from '../../common/notify';
import { ARCHIVED_PEOPLE, COLUMNS, PEOPLE, TODAY, leaveBeforeDue, type Column, type MockTask } from './data';

const shortRange = (from: string, to: string) => ({ from: formatDate(from)?.slice(0, 5), to: formatDate(to) });

/**
 * Szuflada z prawej: nowe zadanie (`task` = null) albo edycja klikniętej karty. `showErrors` = stan makiety
 * „błędy w formularzu”.
 */
export const TaskDrawer = ({ task, showErrors = false, onClose, onArchive }: {
  task: MockTask | null;
  showErrors?: boolean;
  onClose: () => void;
  onArchive: (task: MockTask) => void;
}) => {
  const { t } = useTranslation('tasks');
  const isNew = task === null;
  const [title, setTitle] = useState(showErrors ? 'Ab' : task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [due, setDue] = useState<string | null>(showErrors ? '2026-11-12' : task?.due ?? null);
  const [people, setPeople] = useState<string[]>(task?.people ?? []);
  const [column, setColumn] = useState<Column>(task?.column ?? 'draft');

  // Osoby z archiwum zostają przy starym zadaniu, ale nie da się ich dodać.
  const options = [...PEOPLE, ...ARCHIVED_PEOPLE.filter((p) => people.includes(p))];
  const draft: MockTask = { ...(task ?? { id: 0, createdBy: '', createdAt: '' }), title, due: due ?? undefined, people, column };
  const onLeave = people.map((p) => ({ p, leave: leaveBeforeDue(draft, p) })).filter((x) => x.leave);

  const save = () => {
    notify.success(isNew ? t('added') : t('saved'));
    onClose();
  };

  return (
    <Drawer opened onClose={onClose} position="right" size="md" title={<Text ff="heading" fw={600} size="lg">{isNew ? t('new_task') : t('task_details')}</Text>}>
      <Stack>
        <TextInput
          label={t('field_title')}
          description={t('field_title_hint')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          error={showErrors && t('error_title')}
          required
          data-autofocus
        />
        <Textarea label={t('field_description')} value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={3} maxRows={10} />
        <Group grow align="flex-start">
          <DateField label={t('field_due')} value={due} onChange={setDue} minDate={isNew ? TODAY : undefined} error={showErrors && t('error_due_past')} />
          <Select
            label={t('field_column')}
            data={COLUMNS.map((c) => ({ value: c, label: t(`column.${c}`) }))}
            value={column}
            onChange={(v) => v && setColumn(v as Column)}
            allowDeselect={false}
          />
        </Group>
        <MultiSelect
          label={t('field_people')}
          description={t('field_people_hint')}
          placeholder={people.length === 0 ? t('field_people_placeholder') : undefined}
          data={options.map((p) => ({ value: p, label: p, disabled: ARCHIVED_PEOPLE.includes(p) }))}
          value={people}
          onChange={setPeople}
          searchable
          hidePickedOptions
          renderOption={({ option }) => {
            const leave = leaveBeforeDue(draft, option.value);
            const archived = ARCHIVED_PEOPLE.includes(option.value);
            return (
              <Stack gap={0}>
                <Text size="sm">{option.label}</Text>
                {archived && <Text size="xs" c="dimmed">{t('option_archived')}</Text>}
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

        {task && (
          <>
            <Divider />
            <Stack gap={2}>
              <Text size="xs" c="dimmed">{t('created_by', { name: task.createdBy, date: formatDateTime(task.createdAt) })}</Text>
              {task.completedAt && <Text size="xs" c="dimmed">{t('completed_at', { date: formatDateTime(task.completedAt) })}</Text>}
            </Stack>
          </>
        )}

        <Group justify="space-between" mt="sm">
          {task ? (
            <Button variant="subtle" color="red" leftSection={<ButtonIcon action="delete" />} onClick={() => onArchive(task)}>{t('delete')}</Button>
          ) : <span />}
          <Group gap="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button leftSection={<ButtonIcon action={isNew ? 'add' : 'save'} />} onClick={save}>{isNew ? t('add') : t('save')}</Button>
          </Group>
        </Group>
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
      <Text>{t('archive_text', { title: task.title })}</Text>
    </ConfirmModal>
  );
};
