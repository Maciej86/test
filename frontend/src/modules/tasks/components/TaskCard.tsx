import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import { ActionIcon, Avatar, Badge, Card, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { CalendarDays, CheckCheck, EllipsisVertical, GripVertical, MessageSquare, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TASK_COLUMNS, formatDate, type BoardPerson, type BoardTask, type TaskColumn } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { dueState } from '../taskDue';
import { PersonAvatar } from './PersonAvatar';

const MAX_AVATARS = 3;
const DUE_COLOR = { overdue: 'red.4', soon: 'yellow.4', normal: 'dimmed' } as const;
const DUE_KEY = { overdue: 'due_overdue', soon: 'due_soon', normal: 'due' } as const;

/** Uchwyt przeciągania z `useSortable` (kolumna tablicy); bez niego karta jest zwykła (np. w testach). */
export interface CardDrag {
  ref: Ref<HTMLDivElement>;
  style: CSSProperties;
  props: HTMLAttributes<HTMLDivElement>;
}

/**
 * Karta na tablicy: tytuł, opis, termin (po czasie czerwony, dziś i jutro żółty) albo data realizacji, przypisane
 * osoby, pasek po lewej przy moim zadaniu i menu „⋮” (Edytuj, Przenieś do, Usuń). Wzór: makieta `TaskCard.tsx`.
 */
export const TaskCard = ({ task, people, meId, drag, onOpen, onMove, onFinish, onArchive }: {
  task: BoardTask;
  people: Map<number, BoardPerson>;
  meId: number;
  drag?: CardDrag;
  onOpen: () => void;
  onMove: (column: TaskColumn) => void;
  /** Oznacz jako zakończone albo cofnij zakończenie. */
  onFinish: () => void;
  onArchive: () => void;
}) => {
  const { t } = useTranslation('tasks');
  const due = dueState(task);
  const done = task.column === 'done';
  const mine = task.assigneeIds.includes(meId);
  const finished = task.finishedAt !== null;
  const assigned = task.assigneeIds.map((id) => people.get(id)).filter((p): p is BoardPerson => p !== undefined);
  const shown = assigned.slice(0, MAX_AVATARS);
  const hidden = assigned.slice(MAX_AVATARS);

  return (
    <Card
      ref={drag?.ref}
      {...drag?.props}
      withBorder
      padding="sm"
      onClick={onOpen}
      data-mine={mine}
      data-finished={finished}
      style={{ cursor: drag ? 'grab' : 'pointer', borderLeft: mine ? '3px solid var(--mantine-color-navy-4)' : undefined, opacity: finished ? 0.55 : undefined, filter: finished ? 'grayscale(1)' : undefined, ...drag?.style }}
    >
      <Group gap={6} wrap="nowrap" align="flex-start">
        <Text c="dimmed" mt={2} visibleFrom="md" aria-hidden>
          <GripVertical size={16} />
        </Text>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" align="flex-start" gap={4}>
            <Text fw={600} size="sm" c={done ? 'dimmed' : undefined} style={{ overflowWrap: 'anywhere' }}>{task.title}</Text>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('card_menu')} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <EllipsisVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item leftSection={<ButtonIcon action="edit" size={14} />} onClick={onOpen}>{t('edit')}</Menu.Item>
                <Menu.Label>{t('move_to')}</Menu.Label>
                {TASK_COLUMNS.filter((c) => c !== task.column).map((c) => (
                  <Menu.Item key={c} leftSection={<MoveRight size={14} />} onClick={() => onMove(c)}>{t(`column.${c}`)}</Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item leftSection={<ButtonIcon action={finished ? 'reopen' : 'finish'} size={14} />} onClick={onFinish}>
                  {finished ? t('unfinish') : t('finish')}
                </Menu.Item>
                <Menu.Item color="red" leftSection={<ButtonIcon action="delete" size={14} />} onClick={onArchive}>{t('delete')}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {finished && <Badge size="sm" variant="light" color="gray" tt="none" w="fit-content">{t('finished_badge')}</Badge>}
          {task.description && !done && <Text size="xs" c="dimmed" lineClamp={2}>{task.description}</Text>}

          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="xs" wrap="nowrap">
              {done && task.completedAt ? (
                <Group gap={4} c="dimmed" wrap="nowrap">
                  <CheckCheck size={14} />
                  <Text size="xs" c="inherit">{t('completed_on', { date: formatDate(task.completedAt) })}</Text>
                </Group>
              ) : due && task.dueDate ? (
                <Tooltip label={t(DUE_KEY[due], { date: formatDate(task.dueDate) })}>
                  <Group gap={4} c={DUE_COLOR[due]} wrap="nowrap" data-due={due}>
                    <CalendarDays size={14} />
                    <Text size="xs" c="inherit" fw={due === 'normal' ? 400 : 600}>{formatDate(task.dueDate)}</Text>
                  </Group>
                </Tooltip>
              ) : null}
              {task.commentCount > 0 && (
                <Tooltip label={t('comments_count', { count: task.commentCount })}>
                  <Group gap={4} c="dimmed" wrap="nowrap" data-comments={task.commentCount}>
                    <MessageSquare size={14} />
                    <Text size="xs" c="inherit">{task.commentCount}</Text>
                  </Group>
                </Tooltip>
              )}
            </Group>

            {assigned.length === 0 ? (
              <Text size="xs" c="dimmed">{t('nobody')}</Text>
            ) : (
              <Avatar.Group spacing={6}>
                {shown.map((p) => <PersonAvatar key={p.id} person={p} leave={task.leaves.find((l) => l.userId === p.id)} />)}
                {hidden.length > 0 && (
                  <Tooltip label={hidden.map((p) => p.name).join(', ')}>
                    <Avatar size="sm" radius="xl" color="gray">{t('more_people', { count: hidden.length })}</Avatar>
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
