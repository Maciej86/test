import { Button, Divider, Drawer, Group, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { formatDateTime, type BoardResponse, type BoardTask } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useFinishTask } from '../tasks.api';
import { TaskComments } from './TaskComments';
import { TaskFields } from './TaskFields';
import { useTaskForm } from './useTaskForm';

/** Szerokość podglądu: 440 px (rozmiar `md`) + 100 px (zmiana z 2026-11-18). Na telefonie cały ekran. */
const DRAWER_WIDTH = 540;
const PHONE_QUERY = '(max-width: 48em)';

/** Podgląd klikniętej karty z prawej: od razu można zmieniać pola i zapisać (odpowiedź 1a); pod spodem komentarze. */
export const TaskDrawer = ({ projectId, board, task, onClose, onArchive }: {
  projectId: number;
  board: BoardResponse;
  task: BoardTask;
  onClose: () => void;
  onArchive: (task: BoardTask) => void;
}) => {
  const { t } = useTranslation('tasks');
  const phone = useMediaQuery(PHONE_QUERY) ?? false;
  const { form, submit, saving } = useTaskForm(projectId, task, onClose);
  const finish = useFinishTask();
  const finished = task.finishedAt !== null;
  const toggleFinished = () =>
    finish.mutate(
      { id: task.id, finished: !finished },
      {
        onSuccess: () => notify.success(t(finished ? 'unfinished_done' : 'finished_done')),
        onError: (error) => notify.error(apiErrorMessage(error, t)),
      },
    );
  return (
    <Drawer
      opened
      onClose={onClose}
      position="right"
      size={phone ? '100%' : DRAWER_WIDTH}
      title={<Text ff="heading" fw={600} size="lg">{t('task_in', { project: board.project.name })}</Text>}
    >
      <form onSubmit={submit} noValidate>
        <Stack>
          <TaskFields form={form} board={board} isNew={false} />
          <Stack gap={2}>
            <Text size="xs" c="dimmed">{t('created_by', { name: task.createdByName, date: formatDateTime(task.createdAt) })}</Text>
            {task.completedAt && <Text size="xs" c="dimmed">{t('completed_at', { date: formatDateTime(task.completedAt) })}</Text>}
          </Stack>
          <Group justify="space-between">
            <Group gap="xs">
              <Button variant="subtle" color="red" leftSection={<ButtonIcon action="delete" />} onClick={() => onArchive(task)}>{t('delete')}</Button>
              <Button variant="subtle" color="gray" leftSection={<ButtonIcon action={finished ? 'reopen' : 'finish'} />} loading={finish.isPending} onClick={toggleFinished}>
                {finished ? t('unfinish') : t('finish')}
              </Button>
            </Group>
            <Group gap="sm">
              <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
              <Button type="submit" leftSection={<ButtonIcon action="save" />} loading={saving}>{t('save')}</Button>
            </Group>
          </Group>
        </Stack>
      </form>
      {/* Poza formularzem: Enter i „Zapisz” zadania nie dotyczą komentarzy (zapisują się osobno). */}
      <Divider my="lg" />
      <TaskComments taskId={task.id} />
    </Drawer>
  );
};
