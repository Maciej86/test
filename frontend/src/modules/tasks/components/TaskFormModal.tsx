import { Button, Group, Modal, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BoardResponse } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { TaskFields } from './TaskFields';
import { useTaskForm } from './useTaskForm';

/** Okno „Nowe zadanie: <projekt>” na środku ekranu (zmiana z 2026-11-18); zadanie trafia na górę wybranej kolumny. */
export const TaskFormModal = ({ projectId, board, onClose }: { projectId: number; board: BoardResponse; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const { form, submit, saving } = useTaskForm(projectId, null, onClose);
  return (
    <Modal opened onClose={onClose} title={t('new_task_in', { project: board.project.name })} size="lg">
      <form onSubmit={submit} noValidate>
        <Stack>
          <TaskFields form={form} board={board} isNew />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action="add" />} loading={saving}>{t('add')}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
