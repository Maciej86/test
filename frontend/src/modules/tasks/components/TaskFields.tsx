import { Alert, Group, MultiSelect, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  TASK_COLUMNS,
  TASK_LEAVE_LOOKAHEAD_DAYS,
  dayjs,
  todayIsoDate,
  ISO_DATE_FORMAT,
  type BoardResponse,
  type TaskLeave,
} from '@app/shared';
import { DateField } from '../../../common/DateField';
import { fieldError } from '../../../core/fieldError';
import { leaveRange } from '../taskDue';
import type { TaskForm, TaskFormValues } from './useTaskForm';


/** Urlop osoby od dziś do terminu (bez terminu: 14 dni); dla zrealizowanych i po terminie: brak. */
const leaveBefore = (leaves: TaskLeave[], userId: number, values: TaskFormValues): TaskLeave | undefined => {
  if (values.column === 'done') return undefined;
  const today = todayIsoDate();
  const until = values.dueDate ?? dayjs(today).add(TASK_LEAVE_LOOKAHEAD_DAYS, 'day').format(ISO_DATE_FORMAT);
  if (until < today) return undefined;
  return leaves.find((l) => l.userId === userId && l.dateFrom <= until && l.dateTo >= today);
};

/**
 * Pola zadania, te same w oknie „Nowe zadanie” i w podglądzie z prawej. Do wyboru osoby z `assignable`; osoba już
 * przypisana, której nie można dodać od nowa (archiwum, spoza projektu), zostaje, ale jest wyłączona.
 */
export const TaskFields = ({ form, board, isNew }: { form: TaskForm; board: BoardResponse; isNew: boolean }) => {
  const { t } = useTranslation('tasks');
  const values = form.getValues();
  const options = board.people.filter((p) => p.assignable || values.assigneeIds.includes(String(p.id)));
  const warnings = values.assigneeIds
    .map((id) => ({ person: board.people.find((p) => String(p.id) === id), leave: leaveBefore(board.leaves, Number(id), values) }))
    .filter((w) => w.person && w.leave);

  return (
    <Stack>
      <TextInput
        label={t('field_title')}
        description={t('field_title_hint')}
        withAsterisk
        autoComplete="off"
        data-autofocus
        {...form.getInputProps('title')}
        error={fieldError(t, form.errors.title)}
      />
      <Textarea
        label={t('field_description')}
        autosize
        minRows={3}
        maxRows={10}
        {...form.getInputProps('description')}
        error={fieldError(t, form.errors.description)}
      />
      <Group grow align="flex-start">
        <DateField
          label={t('field_due')}
          minDate={isNew ? todayIsoDate() : undefined}
          value={values.dueDate}
          onChange={(v) => form.setFieldValue('dueDate', v)}
          error={fieldError(t, form.errors.dueDate)}
        />
        <Select
          label={t('field_column')}
          data={TASK_COLUMNS.map((c) => ({ value: c, label: t(`column.${c}`) }))}
          allowDeselect={false}
          {...form.getInputProps('column')}
        />
      </Group>
      <MultiSelect
        label={t('field_people')}
        description={t('field_people_hint', { project: board.project.name })}
        placeholder={values.assigneeIds.length === 0 ? t('field_people_placeholder') : undefined}
        data={options.map((p) => ({ value: String(p.id), label: p.name, disabled: !p.assignable }))}
        searchable
        hidePickedOptions
        renderOption={({ option }) => {
          const leave = leaveBefore(board.leaves, Number(option.value), values);
          return (
            <Stack gap={0}>
              <Text size="sm">{option.label}</Text>
              {leave && <Text size="xs" c="yellow.4">{t('option_on_leave', leaveRange(leave.dateFrom, leave.dateTo))}</Text>}
            </Stack>
          );
        }}
        {...form.getInputProps('assigneeIds')}
        error={fieldError(t, form.errors.assigneeIds)}
      />
      {warnings.length > 0 && (
        <Alert variant="light" color="yellow" icon={<CalendarClock size={18} />} title={t('leave_warning_title')}>
          <Stack gap={2}>
            {warnings.map(({ person, leave }) => (
              <Text key={person!.id} size="sm">{t('leave_warning', { name: person!.name, ...leaveRange(leave!.dateFrom, leave!.dateTo) })}</Text>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
};
