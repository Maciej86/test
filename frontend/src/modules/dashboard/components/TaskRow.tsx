import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDate, taskBoardPath, taskDueState, type DashboardTask } from '@app/shared';
import { PersonAvatar } from '../../../common/PersonAvatar';
import { daysUntil } from './daysUntil';
import { RowLink } from './RowLink';

const DUE_COLOR = { overdue: 'red.4', soon: 'yellow.4', normal: undefined, none: 'dimmed' } as const;

/**
 * Zadanie w boksie Pulpitu: tytuł, projekt, kolumna i termin (kolory jak na karcie tablicy); `withPeople` dokłada
 * kółka przypisanych. Kliknięcie otwiera tablicę projektu z podglądem tego zadania.
 */
export const TaskRow = ({ task, today, withPeople = false }: { task: DashboardTask; today: string; withPeople?: boolean }) => {
  const { t } = useTranslation('dashboard');
  const due = taskDueState(task.dueDate, task.column, today) ?? 'none';
  const dueText = () => {
    if (task.dueDate === null) return t('my_tasks.no_due');
    const left = daysUntil(task.dueDate, today);
    if (left === 0) return t('my_tasks.due_today');
    if (left === 1) return t('my_tasks.due_tomorrow');
    return formatDate(task.dueDate);
  };
  return (
    <RowLink to={taskBoardPath(task.projectId, task.id)}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box miw={0}>
          <Text fw={500} lineClamp={2}>{task.title}</Text>
          <Group gap={6} mt={2}>
            <Badge variant="outline" color="gray" size="sm">{task.projectName}</Badge>
            <Text size="xs" c="dimmed">{t(`column.${task.column}`)}</Text>
          </Group>
        </Box>
        <Stack gap={4} align="flex-end" style={{ flex: 'none' }}>
          <Text size="sm" c={DUE_COLOR[due]} fw={due === 'overdue' || due === 'soon' ? 600 : undefined} data-due={due}>{dueText()}</Text>
          {withPeople && task.assignees && task.assignees.length > 0 && (
            <Group gap={4} wrap="nowrap">
              {task.assignees.map((p, i) => <PersonAvatar key={`${i}-${p.name}`} name={p.name} archived={p.archived} tooltip={p.name} />)}
            </Group>
          )}
        </Stack>
      </Group>
    </RowLink>
  );
};
