import type { DragEvent } from 'react';
import { ActionIcon, Avatar, Card, Group, Indicator, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { CalendarDays, CheckCheck, EllipsisVertical, GripVertical, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ARCHIVED_PEOPLE, COLUMNS, dueState, leaveBeforeDue, type Column, type MockTask } from './data';

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

const MAX_AVATARS = 3;

const DUE_COLOR = { overdue: 'red.4', soon: 'yellow.4', normal: 'dimmed' } as const;

/** Kółko z inicjałami: żółta kropka = urlop przed terminem, szare = konto w archiwum. */
const PersonAvatar = ({ task, name }: { task: MockTask; name: string }) => {
  const { t } = useTranslation('tasks');
  const leave = leaveBeforeDue(task, name);
  const archived = ARCHIVED_PEOPLE.includes(name);
  const label = archived
    ? t('person_archived', { name })
    : leave
      ? t('person_on_leave', { name, from: formatDate(leave.from)?.slice(0, 5), to: formatDate(leave.to) })
      : name;
  return (
    <Tooltip label={label} withArrow>
      <Indicator color="yellow.5" size={9} offset={3} position="top-end" disabled={!leave} withBorder>
        <Avatar size="sm" radius="xl" color={archived ? 'gray' : 'navy'} variant={archived ? 'outline' : 'light'} opacity={archived ? 0.6 : 1}>
          {initials(name)}
        </Avatar>
      </Indicator>
    </Tooltip>
  );
};

export const TaskCard = ({ task, mine, onOpen, onMove, onArchive, onDragStart, onDragOver }: {
  task: MockTask;
  /** Zadanie przypisane do oglądającego: pasek po lewej. */
  mine: boolean;
  onOpen: () => void;
  onMove: (column: Column) => void;
  onArchive: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
}) => {
  const { t } = useTranslation('tasks');
  const due = dueState(task);
  const done = task.column === 'done';
  const shown = task.people.slice(0, MAX_AVATARS);
  const hidden = task.people.length - shown.length;

  return (
    <Card
      withBorder
      padding="sm"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onClick={onOpen}
      style={{
        cursor: 'grab',
        borderLeft: mine ? '3px solid var(--mantine-color-navy-4)' : undefined,
      }}
      aria-label={mine ? `${task.title}. ${t('assigned_to_you')}` : task.title}
    >
      <Group gap={6} wrap="nowrap" align="flex-start">
        <Text c="dimmed" mt={2} aria-label={t('drag_handle')} visibleFrom="md">
          <GripVertical size={16} />
        </Text>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" align="flex-start" gap={4}>
            <Text fw={600} size="sm" c={done ? 'dimmed' : undefined}>
              {task.title}
            </Text>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('card_menu')} onClick={(e) => e.stopPropagation()}>
                  <EllipsisVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item leftSection={<ButtonIcon action="edit" size={14} />} onClick={onOpen}>{t('edit')}</Menu.Item>
                <Menu.Label>{t('move_to')}</Menu.Label>
                {COLUMNS.filter((c) => c !== task.column).map((c) => (
                  <Menu.Item key={c} leftSection={<MoveRight size={14} />} onClick={() => onMove(c)}>{t(`column.${c}`)}</Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<ButtonIcon action="delete" size={14} />} onClick={onArchive}>{t('delete')}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {task.description && !done && <Text size="xs" c="dimmed" lineClamp={2}>{task.description}</Text>}

          <Group justify="space-between" wrap="nowrap" gap="xs">
            {done && task.completedAt ? (
              <Group gap={4} c="dimmed" wrap="nowrap">
                <CheckCheck size={14} />
                <Text size="xs" c="inherit">{t('completed_on', { date: formatDate(task.completedAt) })}</Text>
              </Group>
            ) : task.due && due ? (
              <Tooltip label={t(due === 'overdue' ? 'due_overdue' : due === 'soon' ? 'due_soon' : 'due', { date: formatDate(task.due) })}>
                <Group gap={4} c={DUE_COLOR[due]} wrap="nowrap">
                  <CalendarDays size={14} />
                  <Text size="xs" c="inherit" fw={due === 'normal' ? 400 : 600}>{formatDate(task.due)}</Text>
                </Group>
              </Tooltip>
            ) : <span />}

            {task.people.length === 0 ? (
              <Text size="xs" c="dimmed">{t('nobody')}</Text>
            ) : (
              <Avatar.Group spacing={6}>
                {shown.map((p) => <PersonAvatar key={p} task={task} name={p} />)}
                {hidden > 0 && (
                  <Tooltip label={task.people.slice(MAX_AVATARS).join(', ')}>
                    <Avatar size="sm" radius="xl" color="gray">{t('more_people', { count: hidden })}</Avatar>
                  </Tooltip>
                )}
              </Avatar.Group>
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
};
