import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ArchivedTask } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useDeleteTask, useRestoreTask } from '../archive.api';
import { isGone } from '../archiveErrors';

/** Po błędzie: zadania nie ma już w archiwum → dymek i zamknięcie okna; inny błąd → dymek, okno zostaje. */
const useOnError = (onClose: () => void) => {
  const { t } = useTranslation('archive');
  return (error: unknown) => {
    if (isGone(error)) {
      notify.error(t('gone'));
      onClose();
    } else notify.error(apiErrorMessage(error, t));
  };
};

/** „Przywrócić zadanie?”: wraca na koniec swojej kolumny (odpowiedź 3a). */
export const RestoreTaskModal = ({ task, onClose }: { task: ArchivedTask; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  const { t: tTasks } = useTranslation('tasks');
  const restore = useRestoreTask();
  const onError = useOnError(onClose);
  const confirm = () =>
    restore.mutate(task.id, {
      onSuccess: () => {
        notify.success(t('restored_task', { title: task.title }));
        onClose();
      },
      onError,
    });
  return (
    <ConfirmModal title={t('restore_task_title')} confirmLabel={t('restore')} confirmAction="restore" loading={restore.isPending} onConfirm={confirm} onClose={onClose}>
      <Text>{t('restore_task_text', { title: task.title, project: task.projectName, column: tTasks(`column.${task.column}`) })}</Text>
    </ConfirmModal>
  );
};

/** „Usunąć zadanie na stałe?”: zwykłe okno z liczbą komentarzy, które znikną (odpowiedź 2a). */
export const DeleteTaskModal = ({ task, onClose }: { task: ArchivedTask; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  const remove = useDeleteTask();
  const onError = useOnError(onClose);
  const confirm = () =>
    remove.mutate(task.id, {
      onSuccess: () => {
        notify.success(t('deleted_task', { title: task.title }));
        onClose();
      },
      onError,
    });
  return (
    <ConfirmModal title={t('delete_task_title')} confirmLabel={t('delete_forever')} confirmAction="delete" danger loading={remove.isPending} onConfirm={confirm} onClose={onClose}>
      <Text>{t('delete_task_text', { title: task.title })}</Text>
      {task.comments > 0 && <Text>{t('delete_task_comments', { comments: t('comments', { count: task.comments }) })}</Text>}
    </ConfirmModal>
  );
};
