import { Alert, Avatar, Badge, Button, Divider, Drawer, Group, Stack, Text } from '@mantine/core';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmByNameModal } from '../../common/ConfirmByNameModal';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateText } from '../../common/DateText';
import { notify } from '../../common/notify';
import { ARCHIVED_EMPLOYEES, type ArchivedEmployee, type ArchivedTask } from './data';

const DRAWER_WIDTH = 540;
const ARCHIVED_NAMES = new Set(ARCHIVED_EMPLOYEES.map((e) => e.name));

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

export const RestoreEmployeeModal = ({ employee, onClose }: { employee: ArchivedEmployee; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  return (
    <ConfirmModal
      title={t('restore_employee_title')}
      confirmLabel={t('restore')}
      confirmAction="restore"
      onConfirm={() => { notify.success(t('restored_employee', { name: employee.name })); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('restore_employee_text', { name: employee.name })}</Text>
    </ConfirmModal>
  );
};

export const DeleteEmployeeModal = ({ employee, onClose }: { employee: ArchivedEmployee; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  return (
    <ConfirmByNameModal
      title={t('delete_employee_title')}
      confirmLabel={t('delete_forever')}
      name={employee.name}
      inputLabel={t('type_name')}
      onConfirm={() => { notify.success(t('deleted_employee', { name: employee.name })); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('delete_employee_text', { name: employee.name })}</Text>
      {employee.tasks > 0 && <Text size="sm" c="dimmed">{t('delete_employee_tasks', { tasks: t('tasks', { count: employee.tasks }) })}</Text>}
    </ConfirmByNameModal>
  );
};

export const RestoreTaskModal = ({ task, onClose }: { task: ArchivedTask; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  const { t: tTasks } = useTranslation('tasks');
  return (
    <ConfirmModal
      title={t('restore_task_title')}
      confirmLabel={t('restore')}
      confirmAction="restore"
      onConfirm={() => { notify.success(t('restored_task', { title: task.title })); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('restore_task_text', { title: task.title, project: task.project, column: tTasks(`column.${task.column}`) })}</Text>
    </ConfirmModal>
  );
};

export const DeleteTaskModal = ({ task, onClose }: { task: ArchivedTask; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  return (
    <ConfirmModal
      title={t('delete_task_title')}
      confirmLabel={t('delete_forever')}
      confirmAction="delete"
      danger
      onConfirm={() => { notify.success(t('deleted_task', { title: task.title })); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('delete_task_text', { title: task.title })}</Text>
      {task.comments.length > 0 && <Text>{t('delete_task_comments', { comments: t('comments', { count: task.comments.length }) })}</Text>}
    </ConfirmModal>
  );
};

const Person = ({ name }: { name: string }) => {
  const { t } = useTranslation('archive');
  const archived = ARCHIVED_NAMES.has(name);
  return (
    <Group gap={8} wrap="nowrap">
      <Avatar size="sm" radius="xl" color={archived ? 'gray' : 'navy'} variant="light">{initials(name)}</Avatar>
      <Text size="sm" c={archived ? 'dimmed' : undefined}>{name}</Text>
      {archived && <Badge size="xs" variant="light" color="gray">{t('archived_person')}</Badge>}
    </Group>
  );
};

/** Podgląd zadania z archiwum: tylko do oglądania, z akcjami na dole. */
export const TaskPreview = ({ task, onClose, onRestore, onDelete }: {
  task: ArchivedTask;
  onClose: () => void;
  onRestore: (task: ArchivedTask) => void;
  onDelete: (task: ArchivedTask) => void;
}) => {
  const { t } = useTranslation('archive');
  const { t: tTasks } = useTranslation('tasks');
  return (
    <Drawer opened onClose={onClose} position="right" size={DRAWER_WIDTH} title={<Text ff="heading" fw={600} size="lg">{t('task_details')}</Text>}>
      <Stack>
        <Alert variant="light" color="gray" icon={<Info size={18} />}>{t('read_only')}</Alert>
        <Stack gap={4}>
          <Text ff="heading" fw={600} size="xl">{task.title}</Text>
          <Text size="sm" c="dimmed">{task.project} · {tTasks(`column.${task.column}`)}</Text>
        </Stack>
        <Stack gap={4}>
          <Text size="sm" fw={600}>{t('description')}</Text>
          <Text size="sm">{task.description}</Text>
        </Stack>
        <Group gap="xl" align="flex-start">
          <Stack gap={4}>
            <Text size="sm" fw={600}>{t('due')}</Text>
            <Text size="sm"><DateText value={task.dueOn} /></Text>
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={600}>{t('assignees')}</Text>
            {task.assignees.length === 0 ? <Text size="sm" c="dimmed">{t('nobody')}</Text> : task.assignees.map((n) => <Person key={n} name={n} />)}
          </Stack>
        </Group>
        <Text size="xs" c="dimmed">
          {t('col_archived')}: {formatDateTime(task.archivedAt)}, {t('archived_by', { name: task.archivedBy })}
        </Text>
        <Group justify="space-between">
          <Button variant="subtle" color="red" leftSection={<ButtonIcon action="delete" />} onClick={() => onDelete(task)}>{t('delete_forever')}</Button>
          <Button leftSection={<ButtonIcon action="restore" />} onClick={() => onRestore(task)}>{t('restore')}</Button>
        </Group>
        <Divider my="xs" />
        <Text size="sm" fw={600}>{t('comments_title')}</Text>
        {task.comments.length === 0 && <Text size="sm" c="dimmed">{t('no_comments')}</Text>}
        {task.comments.map((c) => (
          <Stack key={c.at} gap={4}>
            <Group gap={8}>
              <Person name={c.author} />
              <Text size="xs" c="dimmed">{formatDateTime(c.at)}</Text>
            </Group>
            <Text size="sm" pl={36}>{c.text}</Text>
          </Stack>
        ))}
      </Stack>
    </Drawer>
  );
};
