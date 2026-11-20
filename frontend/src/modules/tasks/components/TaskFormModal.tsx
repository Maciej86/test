import { useTranslation } from 'react-i18next';
import type { BoardResponse } from '@app/shared';
import { FormModal } from '../../../common/FormModal';
import { TaskFields } from './TaskFields';
import { useTaskForm } from './useTaskForm';

/** Okno „Nowe zadanie: <projekt>” na środku ekranu (zmiana z 2026-11-18); zadanie trafia na górę wybranej kolumny. */
export const TaskFormModal = ({ projectId, board, onClose }: { projectId: number; board: BoardResponse; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const { form, submit, saving } = useTaskForm(projectId, null, onClose);
  return (
    <FormModal title={t('new_task_in', { project: board.project.name })} size="lg" submitLabel={t('add')} submitAction="add" loading={saving} onSubmit={submit} onClose={onClose}>
      <TaskFields form={form} board={board} isNew />
    </FormModal>
  );
};
